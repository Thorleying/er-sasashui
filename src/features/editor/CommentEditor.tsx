/**
 * 导入后可视化改 COMMENT，不直接改 SQL 文本。
 */
import { useEffect, useState } from "react";
import { Button, Drawer, Empty, Input, Typography } from "antd";
import type { I18N } from "../../i18n";
import { parseCommentDraft, type CommentDraftTable } from "./applyCommentEdits";

type Translation = (typeof I18N)[keyof typeof I18N];

type CommentEditorProps = {
  open: boolean;
  inputText: string;
  t: Translation;
  onClose: () => void;
  onApply: (draft: CommentDraftTable[]) => void;
};

export function CommentEditor({ open, inputText, t, onClose, onApply }: CommentEditorProps) {
  const [draft, setDraft] = useState<CommentDraftTable[]>([]);

  useEffect(() => {
    if (open) setDraft(parseCommentDraft(inputText));
  }, [open, inputText]);

  const patchTable = (index: number, comment: string) => {
    setDraft((prev) => prev.map((table, i) => (i === index ? { ...table, comment } : table)));
  };

  const patchColumn = (tableIndex: number, columnIndex: number, comment: string) => {
    setDraft((prev) =>
      prev.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              columns: table.columns.map((column, j) =>
                j === columnIndex ? { ...column, comment } : column,
              ),
            }
          : table,
      ),
    );
  };

  return (
    <Drawer
      title={t.commentEditorTitle}
      open={open}
      onClose={onClose}
      width={420}
      destroyOnHidden
      extra={
        <Button type="primary" disabled={draft.length === 0} onClick={() => onApply(draft)}>
          {t.commentEditorApply}
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">{t.commentEditorLead}</Typography.Paragraph>
      {draft.length === 0 ? (
        <Empty description={t.commentEditorEmpty} />
      ) : (
        <div className="comment-editor-list">
          {draft.map((table, tableIndex) => (
            <section key={table.name} className="comment-editor-table">
              <Typography.Title level={5}>{table.name}</Typography.Title>
              <label className="comment-editor-field">
                <span>{t.commentEditorTable}</span>
                <Input
                  value={table.comment}
                  placeholder={t.commentEditorPlaceholder}
                  onChange={(event) => patchTable(tableIndex, event.target.value)}
                />
              </label>
              {table.columns.map((column, columnIndex) => (
                <label key={column.name} className="comment-editor-field">
                  <span>{column.name}</span>
                  <Input
                    value={column.comment}
                    placeholder={t.commentEditorPlaceholder}
                    onChange={(event) => patchColumn(tableIndex, columnIndex, event.target.value)}
                  />
                </label>
              ))}
            </section>
          ))}
        </div>
      )}
    </Drawer>
  );
}
