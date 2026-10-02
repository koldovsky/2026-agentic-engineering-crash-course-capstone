import { Item, Listing, Offer, Project, ProjectSummary } from '../api/api-types';

/** Contract-shaped test data. */
export function aProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Solar station',
    description: null,
    createdAt: '2026-09-30T10:00:00Z',
    ...overrides,
  };
}

export function anItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    projectId: 'p1',
    name: 'Inverter',
    quantity: 1,
    notes: null,
    status: 'Needed',
    chosenOffer: null,
    ...overrides,
  };
}

export function aListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    projectId: 'p1',
    title: 'Deye inverter 5 kW',
    url: 'https://www.olx.ua/d/obyavlenie/deye',
    platform: 'OLX',
    sellerName: 'Petro',
    sellerContact: null,
    notes: null,
    agreedTotal: null,
    status: 'Found',
    statusChangedAt: '2026-09-30T10:00:00Z',
    ...overrides,
  };
}

export function anOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'o1',
    itemId: 'i1',
    itemName: 'Inverter',
    listingId: 'l1',
    listingTitle: 'Deye inverter 5 kW',
    listingPlatform: 'OLX',
    listingStatus: 'Found',
    askingPrice: null,
    agreedPrice: null,
    fit: 'Unverified',
    isChosen: false,
    ...overrides,
  };
}

export function aSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    projectId: 'p1',
    itemCountsByStatus: { needed: 0, sourcing: 0, ordered: 0, received: 0 },
    totals: [],
    itemsWithoutChosenOffer: [],
    chosenOffersWithoutPrice: [],
    ...overrides,
  };
}
