import { calculateBookingTotal, formatMoney } from '../booking';

describe('calculateBookingTotal', () => {
  it('returns zero everything for an empty service list', () => {
    expect(calculateBookingTotal({ services: [] })).toEqual({
      subtotal: 0,
      gstRate: 0.18,
      gstAmount: 0,
      loyaltyDiscount: 0,
      pointsConsumed: 0,
      total: 0,
      currency: 'INR',
    });
  });

  it('applies 18% GST on the subtotal by default', () => {
    const r = calculateBookingTotal({
      services: [
        { name: 'Haircut', price: 350 },
        { name: 'Beard', price: 200 },
      ],
    });
    expect(r.subtotal).toBe(550);
    expect(r.gstAmount).toBe(99); // 550 * 0.18 = 99
    expect(r.total).toBe(649);
    expect(r.loyaltyDiscount).toBe(0);
    expect(r.pointsConsumed).toBe(0);
  });

  it('respects a custom GST rate', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Cut', price: 100 }],
      gstRate: 0.05,
    });
    expect(r.gstAmount).toBe(5);
    expect(r.total).toBe(105);
  });

  it('treats GST 0 as a no-op', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Cut', price: 100 }],
      gstRate: 0,
    });
    expect(r.gstAmount).toBe(0);
    expect(r.total).toBe(100);
  });

  it('honours a quantity > 1 on a service line', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Cut', price: 100, quantity: 3 }],
      gstRate: 0,
    });
    expect(r.subtotal).toBe(300);
    expect(r.total).toBe(300);
  });

  it('redeems loyalty points against the gross at the default 0.50/INR rate', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Combo', price: 500 }],
      loyaltyPointsToRedeem: 200, // 200 * 0.5 = 100 INR off
    });
    // subtotal 500, gst 90, gross 590, discount 100 → total 490
    expect(r.subtotal).toBe(500);
    expect(r.gstAmount).toBe(90);
    expect(r.loyaltyDiscount).toBe(100);
    expect(r.pointsConsumed).toBe(200);
    expect(r.total).toBe(490);
  });

  it('clamps a redemption that would otherwise yield a negative total', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Quick', price: 100 }],
      loyaltyPointsToRedeem: 1000, // would be 500 INR, but gross is 118
    });
    expect(r.loyaltyDiscount).toBe(118);
    expect(r.pointsConsumed).toBe(236); // 118 / 0.5
    expect(r.total).toBe(0);
  });

  it('respects a custom point value', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Cut', price: 1000 }],
      gstRate: 0,
      loyaltyPointsToRedeem: 100,
      loyaltyPointValue: 2, // 100 * 2 = 200 off
    });
    expect(r.loyaltyDiscount).toBe(200);
    expect(r.total).toBe(800);
  });

  it('threads currency through to the return value', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Royal Shave', price: 180 }],
      currency: 'AED',
      gstRate: 0,
    });
    expect(r.currency).toBe('AED');
    expect(r.total).toBe(180);
  });

  it('rounds half-away-from-zero on each line', () => {
    // 33.3333 * 0.18 = 5.99999...
    const r = calculateBookingTotal({
      services: [{ name: 'Trim', price: 33.3333 }],
    });
    expect(r.subtotal).toBe(33.33);
    expect(r.gstAmount).toBe(6);
    expect(r.total).toBe(39.33);
  });

  it('treats negative points as zero', () => {
    const r = calculateBookingTotal({
      services: [{ name: 'Cut', price: 100 }],
      loyaltyPointsToRedeem: -10,
    });
    expect(r.loyaltyDiscount).toBe(0);
    expect(r.pointsConsumed).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats INR with the rupee symbol', () => {
    const out = formatMoney(932, 'INR');
    expect(out).toMatch(/932/);
    expect(out).toMatch(/[₹]|INR/);
  });

  it('formats whole numbers without trailing zeroes', () => {
    expect(formatMoney(500, 'INR')).not.toMatch(/\.00$/);
  });

  it('keeps two decimals when present', () => {
    const out = formatMoney(99.5, 'INR');
    expect(out).toMatch(/99\.5/);
  });
});
