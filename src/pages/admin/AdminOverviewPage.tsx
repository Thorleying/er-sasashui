/**
 * 管理端数据概览：PV/UV、使用指标、三图（访问/使用/每日情况）。
 */
import { Card, Col, Row, Statistic, Typography } from "antd";
import { useEffect, useState } from "react";
import { showError } from "../../app/feedback";
import { AdminDailyOverviewChart } from "../../features/admin/AdminDailyOverviewChart";
import { AdminTrafficChart } from "../../features/admin/AdminTrafficChart";
import { AdminTrendChart } from "../../features/admin/AdminTrendChart";
import { fetchDailyStats, type DayStat } from "../../features/admin/api";

/** 取区间最后一天当作「今日」行；没有数据时全 0。 */
function latestDay(days: DayStat[]): DayStat {
  return (
    days[days.length - 1] ?? {
      date: "",
      pvCount: 0,
      uvCount: 0,
      registerCount: 0,
      loginCount: 0,
      generateCount: 0,
      exportCount: 0,
    }
  );
}

/** 概览页。卡片取区间最后一天。 */
export function AdminOverviewPage() {
  const [days, setDays] = useState<DayStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchDailyStats().then((result) => {
      if (cancelled) return;
      if (result.code !== 0) {
        showError(result.message);
        return;
      }
      setDays(result.data.days);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = latestDay(days);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <Typography.Title level={3} className="admin-page-title">
          数据概览
        </Typography.Title>
        <Typography.Text type="secondary">近 7 日</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日 PV" value={today.pvCount} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日 UV" value={today.uvCount} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日新用户" value={today.registerCount} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日登录" value={today.loginCount} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日生成" value={today.generateCount} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card className="admin-stat-card">
            <Statistic title="今日导出" value={today.exportCount} />
          </Card>
        </Col>
      </Row>
      <Card title="访问趋势">
        <AdminTrafficChart days={days} />
      </Card>
      <Card title="使用趋势">
        <AdminTrendChart days={days} />
      </Card>
      <Card title="每日情况">
        <AdminDailyOverviewChart days={days} />
      </Card>
    </div>
  );
}
