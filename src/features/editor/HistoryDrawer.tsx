/**
 * 生成历史：antd Drawer + List，替代原来的自定义卡片轨道。
 */
import { ApartmentOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Empty, List, Popconfirm, Typography } from "antd";
import type { I18N } from "../../i18n";
import type { SnapshotRecord } from "../../types";

type Translation = (typeof I18N)[keyof typeof I18N];

type HistoryDrawerProps = {
  open: boolean;
  items: SnapshotRecord[];
  t: Translation;
  onClose: () => void;
  onRestore: (snap: SnapshotRecord) => void;
  onDelete: (id: string) => void;
  formatTimestamp: (ts: number | undefined) => string;
};

export function HistoryDrawer({
  open,
  items,
  t,
  onClose,
  onRestore,
  onDelete,
  formatTimestamp,
}: HistoryDrawerProps) {
  return (
    <Drawer title={t.historyTitle} open={open} onClose={onClose} width={400} destroyOnHidden>
      {items.length === 0 ? (
        <Empty description={t.historyEmpty} />
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="restore" type="link" onClick={() => onRestore(item)}>
                  {t.historyRestore}
                </Button>,
                <Popconfirm
                  key="delete"
                  title={t.historyDelete}
                  onConfirm={() => void onDelete(item.id)}
                >
                  <Button type="link" danger>
                    {t.historyDelete}
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  item.thumbnail ? (
                    <Avatar shape="square" size={56} src={item.thumbnail} alt="" />
                  ) : (
                    <Avatar shape="square" size={56} icon={<ApartmentOutlined />} />
                  )
                }
                title={formatTimestamp(item.updatedAt)}
                description={
                  <Typography.Text type="secondary">
                    {item.nodes.length} {t.historyEntities}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
