/**
 * 分享链接弹窗：展示只读 URL 并一键复制。
 */
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, Space, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

export type ShareLinkModalProps = {
  open: boolean;
  loading: boolean;
  url: string;
  expiresHint: string;
  title: string;
  hint: string;
  copyLabel: string;
  copiedLabel: string;
  onClose: () => void;
};

export function ShareLinkModal({
  open,
  loading,
  url,
  expiresHint,
  title,
  hint,
  copyLabel,
  copiedLabel,
  onClose,
}: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open, url]);

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("share-link-input") as HTMLInputElement | null;
      input?.select();
    }
  }, [url]);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="copy"
          type="primary"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          disabled={!url || loading}
          onClick={() => void handleCopy()}
        >
          {copied ? copiedLabel : copyLabel}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {hint}
        </Typography.Paragraph>
        <Input
          id="share-link-input"
          readOnly
          value={loading ? "生成中…" : url}
          addonAfter={
            <Button
              type="text"
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              disabled={!url || loading}
              onClick={() => void handleCopy()}
            />
          }
        />
        {expiresHint ? <Alert type="info" showIcon message={expiresHint} /> : null}
      </Space>
    </Modal>
  );
}
