import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { breakdownFor, formatINR, PRICING_MODEL_LABEL, useAction, useBackend, useDb, type ProblemType } from '@profecian/shared';
import { AppText, asIcon, Badge, Banner, Button, colors, confirmAction, EmptyState, IconButton, KeyValue, spacing, Toggle } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row } from '@/components/admin';
import { CategorySheet, ProblemSheet } from '@/components/ServiceForms';

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const backend = useBackend();
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<ProblemType | 'new' | null>(null);
  const del = useAction(backend.admin.deleteProblemType);
  const c = db.categories.find((x) => x.id === id);
  if (!c) return <Page title="Service"><EmptyState icon="search-outline" title="Category not found" message="" actionLabel="All services" onAction={() => router.replace('/services')} /></Page>;
  const problems = db.problemTypes.filter((p) => p.categoryId === c.id);
  const sample = problems[0] ? breakdownFor(problems[0], c, db.settings) : null;

  return (
    <Page
      title={c.name}
      subtitle={c.tagline}
      permission="services"
      actions={
        <>
          <Badge label={c.enabled ? 'Live' : 'Disabled'} tone={c.enabled ? 'success' : 'neutral'} />
          <Button label="Edit category" size="sm" variant="outline" icon="create-outline" onPress={() => setEditing(true)} />
          <Button label="Add problem type" size="sm" icon="add" onPress={() => setProblem('new')} />
        </>
      }
    >
      {del.error ? <Banner tone="danger" icon="alert-circle" title={del.error} /> : null}
      <Row min={320}>
        <Panel title="Pricing & commission">
          <KeyValue label="Platform commission" value={`${Math.round(c.commissionRate * 100)}% of service amount`} />
          <KeyValue label="GST (platform setting)" value={`${Math.round(db.settings.taxRate * 100)}%`} />
          {sample ? (
            <>
              <AppText variant="small" style={{ marginTop: spacing.sm }}>Example — {problems[0].name}:</AppText>
              <KeyValue label="Customer pays" value={`${formatINR(sample.total)} (${formatINR(sample.serviceAmount)} + GST ${formatINR(sample.tax)})`} />
              <KeyValue label="Platform keeps" value={formatINR(sample.commission)} tone="primary" />
              <KeyValue label="Vendor earns" value={formatINR(sample.vendorPayout)} tone="success" />
            </>
          ) : null}
        </Panel>
        <Panel title="About">
          <AppText variant="small" color={colors.text}>{c.description || 'No description.'}</AppText>
          <AppText variant="small">Includes: {c.includes.join(' · ') || '—'}</AppText>
        </Panel>
      </Row>
      <Panel title={`Problem types (${problems.length})`}>
        <DataTable
          rows={problems}
          rowKey={(p) => p.id}
          onRowPress={(p) => setProblem(p)}
          empty="No problem types yet — add the first one."
          columns={[
            { key: 'name', title: 'Problem type', flex: 2, min: 240, sort: (p) => p.name, render: (p) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={asIcon(p.icon)} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}><Cell title={p.name} sub={p.description} /></View>
              </View>
            ) },
            { key: 'model', title: 'Pricing', min: 150, render: (p) => <Cell title={formatINR(p.price)} sub={PRICING_MODEL_LABEL[p.pricingModel]} />, sort: (p) => p.price },
            { key: 'dur', title: 'Duration', min: 100, render: (p) => <Cell title={`${p.durationMins} min`} />, sort: (p) => p.durationMins },
            { key: 'bk', title: 'Bookings', min: 100, align: 'right', render: (p) => <Cell title={String(db.bookings.filter((b) => b.problemTypeId === p.id).length)} /> },
            { key: 'on', title: 'Enabled', min: 110, render: (p) => <Toggle label={`${p.name} enabled`} value={p.enabled} onChange={(v) => backend.admin.saveProblemType({ ...p, enabled: v })} /> },
            { key: 'del', title: '', min: 70, align: 'right', render: (p) => (
              <IconButton icon="trash-outline" label={`Delete ${p.name}`} tone="danger" size={32} onPress={async () => {
                if (await confirmAction('Delete problem type', `Delete "${p.name}"? Problem types with bookings can only be disabled.`, 'Delete')) await del.run(p.id);
              }} />
            ) },
          ]}
        />
      </Panel>
      {editing ? <CategorySheet visible initial={c} onClose={() => setEditing(false)} /> : null}
      {problem ? <ProblemSheet visible categoryId={c.id} initial={problem === 'new' ? undefined : problem} onClose={() => setProblem(null)} /> : null}
    </Page>
  );
}
