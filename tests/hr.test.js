const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const c = load(['js/hr.js'], { navigator: {} });
const parseHeartRate = c.get('parseHeartRate');
const hrSupported = c.get('hrSupported');

const dv = (bytes) => new DataView(new Uint8Array(bytes).buffer);

test('pulso en uint8 (flags bit 0 = 0)', () => {
  assert.equal(parseHeartRate(dv([0x00, 72])), 72);
  assert.equal(parseHeartRate(dv([0x06, 140, 0x10, 0x00])), 140);
});

test('pulso en uint16 little-endian (flags bit 0 = 1)', () => {
  assert.equal(parseHeartRate(dv([0x01, 0x2c, 0x01])), 300);
  assert.equal(parseHeartRate(dv([0x01, 0x96, 0x00])), 150);
});

test('sin Web Bluetooth no está disponible', () => {
  assert.equal(hrSupported(), false);
});
