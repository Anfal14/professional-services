/**
 * City-based pricing in the shared rules and the mock backend. The rule cases are the same as
 * backend/src/test/java/com/profecian/pricing/CityPricingTest.java, and the booking cases the same
 * as CityPricingIT.java, so the mock and the Spring Boot backend are held to one behaviour.
 *
 *   npm test   (from the repo root)
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cityPrice, commissionRateIn, createMockBackend, DEMO, inspectionFeeIn, problemPriceIn, type CityInput } from '../src/index';

const city = (name: string, priceLevel: number, commissionRate?: number) => ({ name, priceLevel, commissionRate });

describe('city price rules', () => {
  test('level prices round to the nearest amount ending in 9', () => {
    assert.equal(cityPrice(249, 125), 309); // 311.25
    assert.equal(cityPrice(249, 120), 299); // 298.80
    assert.equal(cityPrice(149, 110), 159); // 163.90 → 159 (4.9 away) not 169 (5.1)
    assert.equal(cityPrice(149, 125), 189); // 186.25
    assert.equal(cityPrice(4999, 125), 6249); // 6248.75
    assert.equal(cityPrice(249, 150), 369); // 373.50
    assert.equal(cityPrice(249, 80), 199); // 199.20
  });

  test('a tie goes up and tiny amounts stay at least 9', () => {
    assert.equal(cityPrice(300, 105), 319); // 315
    assert.equal(cityPrice(280, 105), 299); // 294 is exactly between 289 and 299
    assert.equal(cityPrice(8, 50), 9);
  });

  test('the base level and free services are left alone', () => {
    assert.equal(cityPrice(311, 100), 311);
    assert.equal(cityPrice(250.5, 100), 250.5);
    assert.equal(cityPrice(311, undefined), 311);
    assert.equal(cityPrice(0, 150), 0);
  });

  test('an exact city price beats the level', () => {
    const fan = { price: 249, cityPrices: { Mumbai: 349 } };
    assert.equal(problemPriceIn(fan, city('Mumbai', 125)), 349);
    assert.equal(problemPriceIn(fan, city('Pune', 110)), 269); // 273.90
    assert.equal(problemPriceIn(fan, city('Solapur', 100)), 249);
    assert.equal(problemPriceIn(fan, undefined), 249);
  });

  test('the inspection fee follows the level', () => {
    const settings = { defaultInspectionFee: 199 };
    assert.equal(inspectionFeeIn(undefined, settings, city('Mumbai', 125)), 249); // 248.75
    assert.equal(inspectionFeeIn({ inspectionFee: 999 }, settings, city('Mumbai', 125)), 1249); // 1248.75
    assert.equal(inspectionFeeIn({ inspectionFee: 999 }, settings, city('Solapur', 100)), 999);
    assert.equal(inspectionFeeIn({ inspectionFee: 999 }, settings, undefined), 999);
  });

  test('a city commission replaces the category rate', () => {
    const settings = { defaultCommissionRate: 0.2 };
    assert.equal(commissionRateIn({ commissionRate: 0.18 }, settings, city('Mumbai', 125, 0.22)), 0.22);
    assert.equal(commissionRateIn({ commissionRate: 0.18 }, settings, city('Pune', 110)), 0.18);
    assert.equal(commissionRateIn({ commissionRate: 0.18 }, settings, undefined), 0.18);
    assert.equal(commissionRateIn(undefined, settings, city('Pune', 110)), 0.2);
  });
});

/** A fresh mock backend with the demo customer signed in. */
async function setup() {
  const mem = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  };
  const backend = createMockBackend({ storage, namespace: 'test', latencyMs: 0 });
  await backend.init();
  const otp = await backend.customer.requestOtp(DEMO.customerPhone);
  const { customer } = await backend.customer.verifyOtp(otp.requestId, '123456');
  const date = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const book = async (cityName: string, group: { categoryId: string; problemTypeIds: string[]; inspection?: { description: string } }) => {
    const [b] = await backend.customer.checkout({
      customerId: customer!.id, groups: [group], date, slot: '12:00 PM',
      address: { label: 'Other', line: '7, Price Street', city: cityName }, contactName: 'Priya Sharma', contactPhone: '9876500001',
    });
    return b;
  };
  const newCity = (name: string, priceLevel: number, commissionRate?: number): CityInput =>
    ({ name, state: 'Testland', status: 'live', lat: 15, lng: 75, radiusKm: 20, areas: [], disabledCategoryIds: [], priceLevel, commissionRate });
  const db = () => backend.getSnapshot().db;
  return { backend, book, newCity, db };
}

const electrician = (...problemTypeIds: string[]) => ({ categoryId: 'electrician', problemTypeIds });

describe('mock backend', () => {
  test('the seed carries price levels, commission and exact prices', async () => {
    const { db } = await setup();
    const mumbai = db().settings.cities.find((c) => c.name === 'Mumbai')!;
    assert.equal(mumbai.priceLevel, 125);
    assert.equal(mumbai.commissionRate, 0.22);
    const solapur = db().settings.cities.find((c) => c.name === 'Solapur')!;
    assert.equal(solapur.priceLevel, 100);
    assert.equal(solapur.commissionRate, undefined);
    assert.equal(db().problemTypes.find((p) => p.id === 'el-fan')!.cityPrices?.Mumbai, 349);
  });

  test("a booking uses the address city's prices and commission", async () => {
    const { backend, book, newCity, db } = await setup();
    await backend.admin.saveCity(newCity('Pricetown', 125, 0.25));

    const b = await book('Pricetown', electrician('el-fan', 'el-switch'));
    assert.deepEqual(b.items!.map((i) => i.price), [309, 189]);
    assert.equal(b.price.serviceAmount, 498);
    assert.equal(b.price.tax, 90);
    assert.equal(b.price.total, 588);
    assert.equal(b.price.commissionRate, 0.25);
    assert.equal(b.price.commission, 125);
    assert.equal(b.price.vendorPayout, 373);

    const base = await book('Solapur', electrician('el-fan', 'el-switch'));
    assert.equal(base.price.serviceAmount, 398);
    assert.equal(base.price.commissionRate, db().categories.find((c) => c.id === 'electrician')!.commissionRate);

    const mumbai = await book('Mumbai', electrician('el-fan', 'el-switch'));
    assert.deepEqual(mumbai.items!.map((i) => i.price), [349, 189]);
    assert.equal(mumbai.price.commissionRate, 0.22);
  });

  test('admin sets and clears an exact city price', async () => {
    const { backend, book, newCity } = await setup();
    await backend.admin.saveCity(newCity('Exactville', 120));

    const set = await backend.admin.setCityPrice('el-switch', 'Exactville', 175.5);
    assert.equal(set.cityPrices?.Exactville, 175.5);
    assert.equal((await book('Exactville', electrician('el-switch'))).items![0].price, 175.5);

    const cleared = await backend.admin.setCityPrice('el-switch', 'Exactville', null);
    assert.equal(cleared.cityPrices?.Exactville, undefined);
    assert.equal((await book('Exactville', electrician('el-switch'))).items![0].price, 179); // 178.8

    await assert.rejects(backend.admin.setCityPrice('el-switch', 'Exactville', -1), /Enter a valid price/);
    await assert.rejects(backend.admin.setCityPrice('el-switch', 'Atlantis', 100), /City not found/);
  });

  test("the inspection fee follows the city's price level", async () => {
    const { backend, book, newCity } = await setup();
    await backend.admin.saveCity(newCity('Feeburg', 125));
    const notSure = { categoryId: 'ac-repair', problemTypeIds: [], inspection: { description: 'Water dripping from the indoor unit' } };

    const baseFee = (await book('Solapur', notSure)).inspection!.fee;
    const b = await book('Feeburg', notSure);
    assert.equal(b.inspection!.fee, cityPrice(baseFee, 125));
    assert.equal(b.inspection!.fee % 10, 9);
    assert.ok(b.inspection!.fee > baseFee);
    assert.equal(b.price.serviceAmount, b.inspection!.fee);
  });

  test('existing bookings keep their price when the city changes', async () => {
    const { backend, book, newCity, db } = await setup();
    await backend.admin.saveCity(newCity('Keepsville', 125, 0.25));
    const before = await book('Keepsville', electrician('el-fan'));
    assert.equal(before.price.serviceAmount, 309);

    await backend.admin.saveCity(newCity('Keepsville', 150), 'Keepsville');

    const same = db().bookings.find((x) => x.id === before.id)!;
    assert.deepEqual(same.price, before.price);
    assert.equal(same.items![0].price, 309);

    const after = await book('Keepsville', electrician('el-fan'));
    assert.equal(after.items![0].price, 369); // 373.5
    assert.equal(after.price.commissionRate, db().categories.find((c) => c.id === 'electrician')!.commissionRate);
  });

  test('price level and commission are validated', async () => {
    const { backend, newCity } = await setup();
    await assert.rejects(backend.admin.saveCity(newCity('Cheapside', 20)), /Price level must be a whole percentage between 50 and 300/);
    await assert.rejects(backend.admin.saveCity(newCity('Greedham', 100, 0.9)), /City commission must be between 0 and 60%/);
  });

  test("deleting a city removes its exact prices", async () => {
    const { backend, newCity, db } = await setup();
    await backend.admin.saveCity(newCity('Gonetown', 110));
    await backend.admin.setCityPrice('el-fan', 'Gonetown', 260);
    await backend.admin.deleteCity('Gonetown');
    assert.equal(db().problemTypes.find((p) => p.id === 'el-fan')!.cityPrices?.Gonetown, undefined);
    assert.equal(db().problemTypes.find((p) => p.id === 'el-fan')!.cityPrices?.Mumbai, 349);
  });
});
