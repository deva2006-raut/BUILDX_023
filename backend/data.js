const users = [
  { id: 'u1', username: 'patient', role: 'PATIENT', name: 'John Doe' },
  { id: 'u2', username: 'admin', role: 'COMMAND_CENTER', name: 'Commander Shepard' },
  { id: 'u3', username: 'hospital', role: 'HOSPITAL', name: 'Dr. Strange', hospitalId: 'h1' },
  { id: 'u4', username: 'ambulance', role: 'AMBULANCE', name: 'Driver Dan', ambulanceId: 'a1' },
  { id: 'u5', username: 'bloodbank', role: 'BLOOD_BANK', name: 'Nurse Joy', bloodBankId: 'bb1' },
];

const hospitals = [
  {
    id: 'h1', name: 'AIIMS Nagpur', lat: 21.0664, lng: 79.0345, address: 'MIHAN, Nagpur',
    icu: { total: 12, used: 8 }, er: { total: 25, used: 15 },
    trauma: true, specialists: { cardiology: true, neurology: true },
    blood: { 'O-': 5, 'A+': 10 }, load: 65, status: 'ONLINE', receiving: true
  },
  {
    id: 'h2', name: 'GMC Nagpur', lat: 21.1278, lng: 79.0967, address: 'Medical Square, Nagpur',
    icu: { total: 10, used: 10 }, er: { total: 20, used: 18 }, // Full ICU
    trauma: true, specialists: { cardiology: true, neurology: false },
    blood: { 'O-': 0, 'A+': 30 }, load: 95, status: 'ONLINE', receiving: true
  }
];

const ambulances = [
  { id: 'a1', name: 'AMB-01 (ALS)', lat: 21.135, lng: 79.075, status: 'AVAILABLE', type: 'ALS' },
  { id: 'a2', name: 'AMB-02 (BLS)', lat: 21.070, lng: 79.040, status: 'AVAILABLE', type: 'BLS' }
];

const bloodBanks = [
  { id: 'bb1', name: 'GSB Blood Bank', lat: 21.130, lng: 79.085, status: 'ONLINE', inventory: { 'O-': 12, 'A+': 50 } }
];

module.exports = { users, hospitals, ambulances, bloodBanks };
