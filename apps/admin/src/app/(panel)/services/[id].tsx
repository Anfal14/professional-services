import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  commissionRateIn, computeBreakdown, findCity, formatINR, hasCityPrice, inspectionFeeIn, isCategoryOfferedIn, PRICING_MODEL_LABEL, problemPriceIn,
  useAction, useBackend, useDb, type ProblemType,
} from '@profecian/shared';
import { AppText, asIcon, Badge, Banner, Button, colors, confirmAction, EmptyState, IconButton, KeyValue, spacing, Toggle } from '@profecian/ui';
import { Cell, DataTable, Page, Panel, Row } from '@/components/admin';
import { useCityScope } from '@/components/cityScope';
import { CategorySheet, ProblemSheet } from '@/components/ServiceForms';

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const backend = useBackend();
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<ProblemType | 'new' | null>(null);
  const del = useAction(backend.admin.deleteProblemType);
  // With a city selected, everything money-related on this page is that city's.
  const { city } = useCityScope();
  const cityInfo = findCity(db.settings, city ?? undefined);
  const c = db.categories.find((x) => x.id === id);
  if (!c) return <Page title="Service"><EmptyState icon="search-outline" title="Category not found" message="" actionLabel="All services" onAction={() => router.replace('/services')} /></Page>;
  const problems = db.problemTypes.filter((p) => p.categoryId === c.id);
  const rate = commissionRateIn(c, db.settings, cityInfo);
  const sample = problems[0] ? computeBreakdown(problemPriceIn(problems[0], cityInfo), rate, db.settings.taxRate) : null;
  const percent = (r: number) => `${Math.round(r * 1000) / 10}%`;

  return (
    <Page
      title={c.name}
      subtitle={cityInfo ? `${c.tagline} · prices in ${cityInfo.name}` : c.tagline}
      permission="services"
      cityFilter
      actions={
        <>
          <Badge label={c.enabled ? 'Live' : 'Disabled'} tone={c.enabled ? 'success' : 'neutral'} />
          <Button label="Edit category" size="sm" variant="outline" icon="create-outline" onPress={() => setEditing(true)} />
          <Button label="Add problem type" size="sm" icon="add" onPress={() => setProblem('new')} />
        </>
      }
    >
      {del.error ? <Banner tone="danger" icon="alert-circle" title={del.error} /> : null}
      {cityInfo && !isCategoryOfferedIn(cityInfo, c.id) ? <Banner tone="warning" icon="location-outline" title={`${c.name} isn’t offered in ${cityInfo.name}`} message="Customers there can’t book it. Turn it on under Cities." /> : null}
      <Row min={320}>
        <Panel title="Pricing & commission">
          <KeyValue label="Platform commission" value={`${percent(rate)} of service amount${cityInfo?.commissionRate != null ? ` (${cityInfo.name} rate; category rate ${percent(c.commissionRate)})` : ''}`} />
          {cityInfo ? <KeyValue label={`Price level in ${cityInfo.name}`} value={cityInfo.priceLevel === 100 ? 'Base prices' : `${cityInfo.priceLevel}% of base, rounded to end in 9`} /> : null}
          <KeyValue label="“Not sure” inspection fee" value={formatINR(inspectionFeeIn(c, db.settings, cityInfo))} />
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
            { key: 'model', title: cityInfo ? `Price in ${cityInfo.name}` : 'Pricing', min: 190, sort: (p) => problemPriceIn(p, cityInfo), render: (p) => (
              <View style={{ gap: 3, alignItems: 'flex-start' }}>
                <Cell
                  title={formatINR(problemPriceIn(p, cityInfo))}
                  sub={!cityInfo || (cityInfo.priceLevel === 100 && !hasCityPrice(p, cityInfo)) ? PRICING_MODEL_LABEL[p.pricingModel] : `Base ${formatINR(p.price)} · ${PRICING_MODEL_LABEL[p.pricingModel]}`}
                />
                {hasCityPrice(p, cityInfo) ? <Badge label="Exact city price" tone="primary" /> : null}
              </View>
            ) },
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
      {problem ? <ProblemSheet visible categoryId={c.id} city={cityInfo} initial={problem === 'new' ? undefined : problem} onClose={() => setProblem(null)} /> : null}
    </Page>
  );
}
