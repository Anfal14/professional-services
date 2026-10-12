import { useState } from 'react';
import { View } from 'react-native';
import { CITY_STATUS_LABEL, formatINR, useDb, type City, type CityStatus, type Database } from '@profecian/shared';
import { AppText, Badge, Button, Card, KeyValue, spacing } from '@profecian/ui';
import { Page, Tabs } from '@/components/admin';
import { CitySheet } from '@/components/CitySheet';

const STATUS_TONE: Record<CityStatus, 'success' | 'info' | 'neutral'> = { live: 'success', coming_soon: 'info', paused: 'neutral' };

/** Supply, demand and money per city, so ops can see where to recruit and when a city is ready to launch. */
function cityStats(db: Database, city: City) {
  const same = (name: string) => name.toLowerCase() === city.name.toLowerCase();
  const vendors = db.vendors.filter((v) => same(v.city));
  const bookings = db.bookings.filter((b) => same(b.address.city));
  return {
    approved: vendors.filter((v) => v.status === 'approved').length,
    pendingVendors: vendors.filter((v) => v.status === 'pending').length,
    customers: db.customers.filter((c) => same(c.city)).length,
    bookings: bookings.length,
    waiting: bookings.filter((b) => b.status === 'pending_assignment').length,
    revenue: bookings.filter((b) => b.payment.status === 'paid').reduce((sum, b) => sum + b.price.total, 0),
  };
}

export default function Cities() {
  const db = useDb();
  const [editing, setEditing] = useState<City | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | CityStatus>('all');
  const cities = db.settings.cities;
  const count = (s: CityStatus) => cities.filter((c) => c.status === s).length;
  const shown = filter === 'all' ? cities : cities.filter((c) => c.status === filter);

  return (
    <Page
      title="Cities"
      subtitle="Where Profecian operates. Launch a city when it has enough approved professionals; customers can only book in live cities."
      permission="settings"
      actions={<Button label="Add city" icon="add" onPress={() => setCreating(true)} />}
    >
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All', count: cities.length },
          { value: 'live', label: 'Live', count: count('live') },
          { value: 'coming_soon', label: 'Coming soon', count: count('coming_soon') },
          { value: 'paused', label: 'Paused', count: count('paused') },
        ]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
        {shown.map((c) => {
          const s = cityStats(db, c);
          const off = c.disabledCategoryIds.map((id) => db.categories.find((x) => x.id === id)?.name ?? id);
          return (
            <Card key={c.name} onPress={() => setEditing(c)} style={{ width: 300, flexGrow: 1, maxWidth: 420, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">{c.name}</AppText>
                  <AppText variant="small">{[c.state, `${c.radiusKm} km radius`, `${c.areas.length} ${c.areas.length === 1 ? 'locality' : 'localities'}`].filter(Boolean).join(' · ')}</AppText>
                </View>
                <Badge label={CITY_STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
              </View>
              <KeyValue label="Approved professionals" value={String(s.approved)} tone={s.approved ? undefined : 'danger'} />
              <KeyValue label="Awaiting approval" value={String(s.pendingVendors)} tone={s.pendingVendors ? 'warning' : undefined} />
              <KeyValue label="Customers" value={String(s.customers)} />
              <KeyValue label="Bookings" value={s.waiting ? `${s.bookings} · ${s.waiting} need a professional` : String(s.bookings)} tone={s.waiting ? 'warning' : undefined} />
              <KeyValue label="Revenue collected" value={formatINR(s.revenue)} />
              <KeyValue label="Prices" value={c.priceLevel === 100 ? 'Base prices' : `${c.priceLevel}% of base`} tone={c.priceLevel === 100 ? undefined : 'primary'} />
              <KeyValue label="Commission" value={c.commissionRate != null ? `${Math.round(c.commissionRate * 1000) / 10}% (city rate)` : 'Category rates'} tone={c.commissionRate != null ? 'primary' : undefined} />
              <AppText variant="small">{off.length ? `Not offered here: ${off.join(', ')}` : 'All services offered'}</AppText>
            </Card>
          );
        })}
        {!shown.length ? <AppText variant="small">No cities here yet.</AppText> : null}
      </View>
      {creating ? <CitySheet visible onClose={() => setCreating(false)} /> : null}
      {editing ? <CitySheet key={editing.name} visible initial={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  );
}
