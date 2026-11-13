import type { CmsSectionData, CmsSectionKey } from '#/types'

export const CMS_SECTION_META: Record<
  CmsSectionKey,
  {
    label: string
    description: string
    metadataFields: Array<{ key: string; label: string; placeholder: string }>
  }
> = {
  hero: {
    label: 'Hero Banner',
    description: 'Main landing banner, headline, and primary call-to-action.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Location Eyebrow',
        placeholder: 'Camotes Island · Cebu, Philippines',
      },
    ],
  },
  story: {
    label: 'Our Sanctuary (Story)',
    description: 'Editorial introduction to the staycation experience.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'The Sanctuary',
      },
      {
        key: 'highlight',
        label: 'Pull Quote / Highlight',
        placeholder: 'Quiet mornings by the sea, unhurried island afternoons.',
      },
    ],
  },
  rooms: {
    label: 'Rooms Showcase',
    description: 'Heading and intro copy above the featured rooms grid.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'Accommodations',
      },
    ],
  },
  amenities: {
    label: 'Amenities & Experience',
    description: 'Curated resort highlights and staycation inclusions.',
    metadataFields: [
      {
        key: 'items',
        label: 'Highlights (comma-separated)',
        placeholder:
          'Private Beachfront Access, High-Speed Wi-Fi, Air-Conditioned Suites, Complimentary Island Breakfast, Airport & Port Transfer Assistance',
      },
    ],
  },
  gallery: {
    label: 'Photo Gallery',
    description: 'Visual showcase of the property and island surroundings.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'Atmosphere',
      },
    ],
  },
  contact: {
    label: 'Contact, Location & Policies',
    description:
      'Resort address, contact details, check-in/out hours, and payment instructions.',
    metadataFields: [
      {
        key: 'address',
        label: 'Address',
        placeholder: 'Santiago Bay, San Francisco, Camotes Island, Cebu',
      },
      {
        key: 'phone',
        label: 'Phone / Mobile',
        placeholder: '+63 917 000 0000',
      },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'stay@jennyswhitehaven.com',
      },
      {
        key: 'checkInTime',
        label: 'Check-In Time',
        placeholder: '2:00 PM',
      },
      {
        key: 'checkOutTime',
        label: 'Check-Out Time',
        placeholder: '12:00 PM',
      },
      {
        key: 'paymentInfo',
        label: 'Payment / GCash Instructions',
        placeholder:
          'GCash: 0917-000-0000 (Jenny White Haven) · 50% deposit confirms your stay.',
      },
    ],
  },
}

export const DEFAULT_CMS_SECTIONS: CmsSectionData[] = [
  {
    key: 'hero',
    title: "Jenny's White Haven",
    subtitle:
      'An intimate rooms-only island sanctuary on the quiet shores of Camotes Island, Cebu.',
    body: 'Thoughtfully designed spaces, warm tropical hospitality, and unhurried days beside crystal-clear waters.',
    ctaLabel: 'Explore Rooms',
    ctaHref: '/rooms',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1800&q=80',
    ],
    metadata: {
      eyebrow: 'Camotes Island · Cebu, Philippines',
    },
    isPublished: true,
    sortOrder: 0,
  },
  {
    key: 'story',
    title: 'Designed for stillness, warmth, and effortless rest.',
    subtitle: 'A boutique staycation shaped by sea breeze and natural light.',
    body: "Tucked away in Camotes Island, Jenny's White Haven pairs serene minimalist architecture with genuine Filipino warmth. Wake up to soft coastal light, spend your afternoon by the shore, and return to crisp linens and quiet comfort.",
    ctaLabel: 'Check Availability',
    ctaHref: '/rooms',
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
    ],
    metadata: {
      eyebrow: 'The Sanctuary',
      highlight: 'Quiet mornings by the sea, unhurried island afternoons.',
    },
    isPublished: true,
    sortOrder: 1,
  },
  {
    key: 'rooms',
    title: 'Private Suites & Island Rooms',
    subtitle:
      'Each room is crafted as a calm coastal retreat with modern essentials and generous space.',
    body: '',
    ctaLabel: 'View All Rooms',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      eyebrow: 'Accommodations',
    },
    isPublished: true,
    sortOrder: 2,
  },
  {
    key: 'amenities',
    title: 'Simple luxuries for an unhurried stay.',
    subtitle: 'Everything you need for a restorative island getaway.',
    body: 'From seamless port-to-haven transfers to curated local recommendations across Camotes Island, our team takes care of the details so you can simply unwind.',
    ctaLabel: 'Book Your Stay',
    ctaHref: '/rooms',
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80',
    ],
    metadata: {
      items:
        'Air-Conditioned Coastal Rooms, High-Speed Fiber Wi-Fi, Private En-Suite Bath, Fresh Linens & Bath Essentials, Port Transfer Assistance, Curated Island Tour Tips',
    },
    isPublished: true,
    sortOrder: 3,
  },
  {
    key: 'gallery',
    title: 'Spaces bathed in tropical light.',
    subtitle: 'A glimpse into daily life at the haven.',
    body: '',
    ctaLabel: '',
    ctaHref: '',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    ],
    metadata: {
      eyebrow: 'Atmosphere',
    },
    isPublished: true,
    sortOrder: 4,
  },
  {
    key: 'contact',
    title: 'Plan your visit to Camotes Island.',
    subtitle:
      'Have questions about ferry schedules, room requests, or group stays? Reach out anytime.',
    body: 'We welcome guests daily with flexible check-in coordination based on Consuelo or Poro port arrivals.',
    ctaLabel: 'Check Booking Status',
    ctaHref: '/booking-status',
    images: [],
    metadata: {
      address: 'Santiago Bay, San Francisco, Camotes Island, Cebu',
      phone: '+63 917 000 0000',
      email: 'stay@jennyswhitehaven.com',
      checkInTime: '2:00 PM',
      checkOutTime: '12:00 PM',
      paymentInfo:
        'GCash / Bank Transfer accepted. A 50% deposit confirms your reservation.',
    },
    isPublished: true,
    sortOrder: 5,
  },
]
