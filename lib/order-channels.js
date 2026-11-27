// Shared between every form that asks a customer "how did you reach us?" —
// components/MeasurementForm.js and components/OrderDetailsForm.js — and
// matches the Type column dropdown on the Orders Google Sheet. Keep all
// three in sync if this list ever changes (add/remove an option here, then
// update the data validation on the sheet's Type column to match).
export const CONTACT_CHANNELS = ['WhatsApp Order', 'Instagram', 'Walk-in', 'Other'];
