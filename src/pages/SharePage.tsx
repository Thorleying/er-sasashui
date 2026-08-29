/**
 * 只读分享页：公开访问 /s/:token，无需登录即可查看 ER 图。
 */
import { Alert, Button, Result, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserLayout } from "../app/UserLayout";
import { showError } from "../app/feedback";
import { useAuth } from "../features/auth/AuthContext";
import { getShareRequest } from "../features/share/api";
import { ShareTableGallery } from "../features/share/ShareTableGallery";
import "../features/share/share-gallery.css";
import type { PublicShare } from "../features/share/types";
import type { SnapshotRecord } from "../types";
import { I18N } from "../i18n";

const t = I18N.zh;

function toSnapshot(share: PublicShare): SnapshotRecord {
  const now = Date.now();
  return {
    id: share.token,
    inputText: share.payload.inputText,
    isColored: share.payload.isColored,
    showComment: share.payload.showComment,
    hideFields: share.payload.hideFields,
    nodes: share.payload.nodes,
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function SharePage() {
  const { token = "" } = useParams();
  const { user } = useAuth();
  const [share, setShare] = useState<PublicShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setShare(null);
    void (async () => {
      const res = await getShareRequest(token);
      if (cancelled) return;
      if (res.code !== 0 || !res.data) {
        setNotFound(true);
        if (res.code !== 40401) showError(res.message);
        setLoading(false);
        return;
      }
      setShare(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const snapshot = useMemo(() => (share ? toSnapshot(share) : null), [share]);

  if (loading) {
    return (
      <UserLayout>
        <div className="share-page-loading">
          <Spin size="large" tip={t.shareLoading} />
        </div>
      </UserLayout>
    );
  }

  if (notFound || !snapshot) {
    return (
      <UserLayout>
        <Result
          status="404"
          title={t.shareNotFoundTitle}
          subTitle={t.shareNotFoundHint}
          extra={
            <Link to="/">
              <Button type="primary">{t.backHome}</Button>
            </Link>
          }
        />
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <Alert
        className="share-readonly-banner"
        type="info"
        showIcon
        message={user ? t.shareReadonlyBannerAuthed : t.shareReadonlyBanner}
        action={
          <Link to={user ? "/app" : "/login"} state={user ? undefined : { from: "/app" }}>
            <Button size="small" type="primary">
              {user ? t.shareOpenGenerator : t.shareLoginToEdit}
            </Button>
          </Link>
        }
      />
      <ShareTableGallery snapshot={snapshot} />
    </UserLayout>
  );
}
