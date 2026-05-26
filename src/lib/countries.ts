export interface CountryConfig {
  currency: string;
  currencySymbol: string;
  taxLabel: string;
  taxPlaceholder: string;
  phonePrefix: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  India: {
    currency: 'INR',
    currencySymbol: '₹',
    taxLabel: 'GSTIN',
    taxPlaceholder: 'GSTIN-27AAAAA0000A1Z1',
    phonePrefix: '+91',
  },
  'United States': {
    currency: 'USD',
    currencySymbol: '$',
    taxLabel: 'EIN',
    taxPlaceholder: 'US-EIN-987654321',
    phonePrefix: '+1',
  },
  'United Kingdom': {
    currency: 'GBP',
    currencySymbol: '£',
    taxLabel: 'VAT',
    taxPlaceholder: 'GB123456789',
    phonePrefix: '+44',
  },
  'European Union': {
    currency: 'EUR',
    currencySymbol: '€',
    taxLabel: 'VAT',
    taxPlaceholder: 'EU123456789',
    phonePrefix: '+',
  },
  Australia: {
    currency: 'AUD',
    currencySymbol: 'A$',
    taxLabel: 'ABN',
    taxPlaceholder: 'ABN 12 345 678 901',
    phonePrefix: '+61',
  },
  Canada: {
    currency: 'CAD',
    currencySymbol: 'C$',
    taxLabel: 'GST/HST',
    taxPlaceholder: 'GST/HST 123456789',
    phonePrefix: '+1',
  },
  UAE: {
    currency: 'AED',
    currencySymbol: 'د.إ',
    taxLabel: 'VAT',
    taxPlaceholder: 'AE123456789',
    phonePrefix: '+971',
  },
  Singapore: {
    currency: 'SGD',
    currencySymbol: 'S$',
    taxLabel: 'GST',
    taxPlaceholder: 'GST-123456789',
    phonePrefix: '+65',
  },
};

export const DEFAULT_COUNTRY = 'India';

export function getCountryConfig(country: string): CountryConfig {
  return COUNTRIES[country] || COUNTRIES[DEFAULT_COUNTRY];
}

export function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    AED: 'د.إ',
    SGD: 'S$',
  };
  return map[currency] || '$';
}
