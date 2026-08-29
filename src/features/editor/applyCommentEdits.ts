/**
 * 把可视化改过的 COMMENT 写回 SQL / DBML 原文，避免用户去改语句。
 */
import { parseDBML } from "../../parser/dbml";
import { parseSQLTables } from "../../parser/sql";
import type { ParsedTable } from "../../types";

export type CommentEdit = {
  table: string;
  column?: string;
  comment: string;
};

export type CommentDraftTable = {
  name: string;
  comment: string;
  columns: Array<{ name: string; comment: string }>;
};

function stripIdent(raw: string): string {
  return (
    raw
      .replace(/^[`"[]|[`"]$/g, "")
      .split(".")
      .pop() ?? raw
  );
}

function namesEqual(a: string, b: string): boolean {
  return stripIdent(a).toLowerCase() === stripIdent(b).toLowerCase();
}

function escapeSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function looksLikeDbml(source: string): boolean {
  return /^\s*Table\s+/im.test(source) && !/^\s*CREATE\s+TABLE/im.test(source);
}

export function collectCommentDraft(tables: ParsedTable[]): CommentDraftTable[] {
  return tables.map((table) => ({
    name: table.name,
    comment: table.comment ?? "",
    columns: table.columns.map((column) => ({
      name: column.name,
      comment: column.comment ?? "",
    })),
  }));
}

export function parseCommentDraft(source: string): CommentDraftTable[] {
  const trimmed = source.trim();
  if (!trimmed) return [];
  let parsed = parseSQLTables(trimmed);
  if (parsed.tables.length === 0) parsed = parseDBML(trimmed);
  return collectCommentDraft(parsed.tables);
}

function applyMysqlColumnComment(line: string, comment: string): string {
  const commentToken = /\bCOMMENT\s*(?:=\s*)?(?:'([^']|'')*'|"([^"]*)")/i;
  if (commentToken.test(line)) {
    return line.replace(commentToken, `COMMENT ${escapeSql(comment)}`);
  }
  if (/,\s*$/.test(line)) {
    return line.replace(/,\s*$/, ` COMMENT ${escapeSql(comment)},`);
  }
  return `${line.replace(/\s*$/, "")} COMMENT ${escapeSql(comment)}`;
}

function applyMysqlTableComment(afterClose: string, comment: string): string {
  const tableComment = /\bCOMMENT\s*=\s*(?:'([^']|'')*'|"([^"]*)")/i;
  if (tableComment.test(afterClose)) {
    return afterClose.replace(tableComment, `COMMENT=${escapeSql(comment)}`);
  }
  return afterClose.replace(/(\))\s*/, `$1 COMMENT=${escapeSql(comment)} `);
}

function isColumnLine(line: string, column: string): boolean {
  const trimmed = line.trim();
  const match = trimmed.match(/^[`"[]?([A-Za-z_][\w$]*)[`"]?\s+/);
  if (!match || !namesEqual(match[1], column)) return false;
  return !/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|CHECK|FULLTEXT|SPATIAL)\b/i.test(trimmed);
}

function applyMysqlEdits(source: string, edits: CommentEdit[]): string {
  const tableEdits = new Map<string, string>();
  const columnEdits = new Map<string, Map<string, string>>();
  for (const edit of edits) {
    if (edit.column) {
      const cols = columnEdits.get(edit.table) ?? new Map<string, string>();
      cols.set(edit.column, edit.comment);
      columnEdits.set(edit.table, cols);
    } else {
      tableEdits.set(edit.table, edit.comment);
    }
  }

  const createRe =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:[`"[]?[A-Za-z_]\w*[`"]?\.)?[`"[]?[A-Za-z_]\w*[`"]?)/gi;
  const blocks: Array<{
    start: number;
    open: number;
    close: number;
    semi: number;
    tableName: string;
  }> = [];
  let match: RegExpExecArray | null;

  while ((match = createRe.exec(source))) {
    const open = source.indexOf("(", match.index);
    if (open < 0) continue;
    let depth = 0;
    let close = -1;
    for (let i = open; i < source.length; i++) {
      if (source[i] === "(") depth += 1;
      else if (source[i] === ")") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) continue;
    const semi = source.indexOf(";", close);
    blocks.push({
      start: match.index,
      open,
      close,
      semi: semi >= 0 ? semi : close,
      tableName: stripIdent(match[1]),
    });
  }

  let result = source;
  for (const block of [...blocks].reverse()) {
    const tableKey = [...columnEdits.keys()].find((key) => namesEqual(key, block.tableName));
    const tableCommentKey = [...tableEdits.keys()].find((key) => namesEqual(key, block.tableName));
    const cols = tableKey ? columnEdits.get(tableKey) : undefined;
    const tableComment = tableCommentKey ? tableEdits.get(tableCommentKey) : undefined;
    if (!cols && tableComment === undefined) continue;

    let body = result.slice(block.open + 1, block.close);
    if (cols) {
      body = body
        .split("\n")
        .map((line) => {
          for (const [column, comment] of cols) {
            if (isColumnLine(line, column)) return applyMysqlColumnComment(line, comment);
          }
          return line;
        })
        .join("\n");
    }

    let after = result.slice(block.close, block.semi);
    if (tableComment !== undefined) {
      after = applyMysqlTableComment(after, tableComment);
    }

    result = result.slice(0, block.open + 1) + body + after + result.slice(block.semi);
  }

  return result;
}

function applyDbmlColumnNote(line: string, comment: string): string {
  const noteRe = /\bnote\s*:\s*(['"])(?:\\.|(?!\1).)*\1/i;
  if (noteRe.test(line)) {
    return line.replace(noteRe, `note: ${escapeSql(comment)}`);
  }
  if (/\[/.test(line)) {
    return line.replace(/\]/, `, note: ${escapeSql(comment)}]`);
  }
  return `${line.replace(/\s*$/, "")} [note: ${escapeSql(comment)}]`;
}

function applyDbmlEdits(source: string, edits: CommentEdit[]): string {
  let result = source;
  for (const edit of edits) {
    const tableRe = new RegExp(
      `(Table\\s+[^\\s{]*${edit.table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\s{]*\\s*\\{)([\\s\\S]*?)(\\n\\})`,
      "i",
    );
    result = result.replace(tableRe, (_all, open: string, body: string, close: string) => {
      let next = body;
      if (edit.column) {
        next = next
          .split("\n")
          .map((line) =>
            isColumnLine(line, edit.column!) ? applyDbmlColumnNote(line, edit.comment) : line,
          )
          .join("\n");
      } else {
        const tableNote = /^\s*Note\s*:\s*(['"])(?:\\.|(?!\1).)*\1/im;
        if (tableNote.test(next)) {
          next = next.replace(tableNote, (hit) =>
            hit.replace(/(['"])(?:\\.|(?!\1).)*\1/, escapeSql(edit.comment)),
          );
        } else {
          next = `${next.replace(/\s*$/, "")}\n  Note: ${escapeSql(edit.comment)}`;
        }
      }
      return `${open}${next}${close}`;
    });
  }
  return result;
}

export function applyCommentEdits(source: string, edits: CommentEdit[]): string {
  const meaningful = edits.filter((edit) => edit.table);
  if (meaningful.length === 0) return source;
  if (looksLikeDbml(source)) return applyDbmlEdits(source, meaningful);
  return applyMysqlEdits(source, meaningful);
}

export function draftToEdits(draft: CommentDraftTable[]): CommentEdit[] {
  return draft.flatMap((table) => [
    { table: table.name, comment: table.comment },
    ...table.columns.map((column) => ({
      table: table.name,
      column: column.name,
      comment: column.comment,
    })),
  ]);
}
