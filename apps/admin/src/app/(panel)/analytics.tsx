import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { cityPerformance, dailySeries, formatDate, formatINR, formatINRCompact, topServices, topVendors, useDb } from '@profecian/shared';
import { AppText, BarList, Button, ColumnChart, LineChart, spacing } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row, Tabs } from '@/components/admin';

/** Chart with a table-view toggle so values are never locked inside the graphic. */
function ChartPanel({ title, chart, table }: { title: string; chart: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Panel title={title} action={<Button label={asTable ? 'Chart' : 'Table'} size="sm" variant="ghost" icon={asTable ? 'bar-chart-outline' : 'list-outline'} onPress={() => setAsTable((t) => !t)} />}>
      {asTable ? table : chart}
    </Panel>
  );
}

export default function Analytics() {
  const db = useDb();
  const [range, setRange] = useState<'30' | '60'>('30');
  const days = Number(range);
  const series = useMemo(() => dailySeries(db, days), [db, days]);
  const services = useMemo(() => topServices(db), [db]);
  const vendors = useMemo(() => topVendors(db), [db]);
  const cities = useMemo(() => cityPerformance(db), [db]);
  const totals = series.reduce((s, p) => ({ revenue: s.revenue + p.revenue, bookings: s.bookings + p.bookings, cancelled: s.cancelled + p.cancelled }), { revenue: 0, bookings: 0, cancelled: 0 });
  const every = days > 30 ? 10 : 5;

  const seriesTable = (key: 'revenue' | 'bookings', format: (n: number) => string) => (
    <DataTable
      rows={[...series].reverse()}
      rowKey={(p) => p.date}
      pageSize={10}
      columns={[
        { key: 'd', title: 'Date', render: (p) => <Cell title={formatDate(p.date)} /> },
        { key: 'v', title: key === 'revenue' ? 'Revenue' : 'Bookings', align: 'right', render: (p) => <Cell title={format(p[key])} /> },
        ...(key === 'bookings' ? [{ key: 'c', title: 'Cancelled', align: 'right' as const, render: (p: (typeof series)[number]) => <Cell title={String(p.cancelled)} /> }] : []),
      ]}
    />
  );

  return (
    <Page title="Analytics" subtitle={`Last ${days} days · ${formatINR(totals.revenue)} collected from ${totals.bookings} bookings (${totals.cancelled} cancelled).`} permission="analytics"
      actions={<Tabs value={range} onChange={setRange} tabs={[{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }]} />}>
      <Row min={440}>
        <ChartPanel
          title="Revenue trend"
          chart={<LineChart accessibilityLabel={`Daily revenue, last ${days} days`} data={series.map((p) => ({ label: p.date.slice(8), value: p.revenue, detail: formatDate(p.date) }))} format={formatINRCompact} xLabelEvery={every} />}
          table={seriesTable('revenue', (n) => formatINR(n))}
        />
        <ChartPanel
          title="Booking trend"
          chart={<ColumnChart accessibilityLabel={`Bookings created per day, last ${days} days`} data={series.map((p) => ({ label: p.date.slice(8), value: p.bookings, detail: formatDate(p.date) }))} xLabelEvery={every} />}
          table={seriesTable('bookings', String)}
        />
      </Row>
      <Row min={380}>
        <ChartPanel
          title="Top services by revenue"
          chart={<BarList format={formatINR} data={services.map((s) => ({ label: s.label, value: s.revenue, detail: `${s.bookings} bookings` }))} />}
          table={<DataTable rows={services} rowKey={(s) => s.id} columns={[
            { key: 'l', title: 'Service', flex: 1.5, render: (s) => <Cell title={s.label} /> },
            { key: 'b', title: 'Bookings', align: 'right', sort: (s) => s.bookings, render: (s) => <Cell title={String(s.bookings)} /> },
            { key: 'r', title: 'Revenue', align: 'right', sort: (s) => s.revenue, render: (s) => <Cell title={formatINR(s.revenue)} /> },
          ]} />}
        />
        <ChartPanel
          title="City-wise performance"
          chart={<BarList format={formatINR} data={cities.map((c) => ({ label: c.label, value: c.revenue, detail: `${c.bookings} bookings · ${c.secondary} active vendors` }))} />}
          table={<DataTable rows={cities} rowKey={(c) => c.id} columns={[
            { key: 'l', title: 'City', render: (c) => <Cell title={c.label} /> },
            { key: 'b', title: 'Bookings', align: 'right', sort: (c) => c.bookings, render: (c) => <Cell title={String(c.bookings)} /> },
            { key: 'v', title: 'Vendors', align: 'right', render: (c) => <Cell title={String(c.secondary)} /> },
            { key: 'r', title: 'Revenue', align: 'right', sort: (c) => c.revenue, render: (c) => <Cell title={formatINR(c.revenue)} /> },
          ]} />}
        />
      </Row>
      <Panel title="Top vendors">
        <DataTable
          rows={vendors}
          rowKey={(v) => v.id}
          pageSize={10}
          columns={[
            { key: 'rank', title: '#', min: 50, render: (v) => <AppText variant="label">{vendors.indexOf(v) + 1}</AppText> },
            { key: 'l', title: 'Vendor', flex: 1.6, min: 180, render: (v) => <Cell title={v.label} /> },
            { key: 'b', title: 'Jobs done', min: 110, align: 'right', sort: (v) => v.bookings, render: (v) => <Cell title={String(v.bookings)} /> },
            { key: 'r', title: 'Service revenue', min: 140, align: 'right', sort: (v) => v.revenue, render: (v) => <Cell title={formatINR(v.revenue)} /> },
            { key: 's', title: 'Rating', min: 100, align: 'right', sort: (v) => v.secondary ?? 0, render: (v) => <Cell title={v.secondary ? `★ ${v.secondary}` : '—'} /> },
          ]}
        />
      </Panel>
      <View style={{ paddingTop: spacing.sm }}>
        <AppText variant="tiny">Revenue = completed & paid bookings incl. GST, attributed to the day the booking was created.</AppText>
      </View>
    </Page>
  );
}
