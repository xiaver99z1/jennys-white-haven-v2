import type { BookingStatus, PaymentStatus, RoomType } from '#/types'
import type { FieldValidationMessages } from '#/lib/validation'

export type LocaleCode = 'en' | 'ko' | 'ja'

export interface LocaleOption {
  code: LocaleCode
  shortLabel: string
  countryCode: string
  nativeName: string
  englishName: string
  dateLocale: string
}

export const LOCALE_STORAGE_KEY = 'jwh_locale'

export const SUPPORTED_LOCALES: readonly LocaleOption[] = [
  {
    code: 'en',
    shortLabel: 'EN',
    countryCode: 'GB',
    nativeName: 'English',
    englishName: 'English (UK / International)',
    dateLocale: 'en-US',
  },
  {
    code: 'ko',
    shortLabel: '한국어',
    countryCode: 'KR',
    nativeName: '한국어',
    englishName: 'Korean',
    dateLocale: 'ko-KR',
  },
  {
    code: 'ja',
    shortLabel: '日本語',
    countryCode: 'JP',
    nativeName: '日本語',
    englishName: 'Japanese',
    dateLocale: 'ja-JP',
  },
] as const

export interface TranslationDictionary {
  nav: {
    sanctuary: string
    rooms: string
    exploreCamotes: string
    bookingStatus: string
    more: string
    morePagesLabel: string
    photoGallery: string
    photoGalleryDesc: string
    guestReviews: string
    guestReviewsDesc: string
    googleMap: string
    googleMapDesc: string
    contactUs: string
    contactUsDesc: string
    languageLabel: string
    selectLanguageLabel: string
  }
  currency: {
    mobileLabel: string
    displayRatesIn: string
    billingHint: string
  }
  footer: {
    defaultTagline: string
    locationAndContact: string
    checkIn: string
    checkOut: string
    guestServices: string
    browseRoomsAndRates: string
    camotesIslandGuide: string
    checkBookingStatus: string
    photoGallery: string
    guestReviews: string
    googleMapAndDirections: string
    contactUs: string
    cookiePreferences: string
    staffPortal: string
  }
  common: {
    guests: string
    any: string
    guestCount: (count: number) => string
    guestsPlusCount: (count: number) => string
    upToGuests: (count: number) => string
    maxGuests: (count: number) => string
    perNight: string
    nightCount: (count: number) => string
    roomNumber: (num: string) => string
    roomTypes: Record<RoomType | 'ALL', string>
    bookingStatuses: Record<BookingStatus, string>
    paymentStatuses: Record<PaymentStatus, string>
    reviewRatings: Record<number, string>
    ratingOutOfFive: (rating: number) => string
  }
  datePicker: {
    checkIn: string
    checkOut: string
    addDate: string
    selectCheckIn: string
    selectCheckOut: string
    nightsSelected: (nights: number) => string
    bookedUnavailable: string
    clearDates: string
    done: string
    cannotCrossBooked: (dateDisplay: string) => string
  }
  extraGuests: {
    additionalPersonsOptional: string
    adult: string
    child: string
  }
  home: {
    checkAvailability: string
    theSanctuary: string
    allPictures: string
    includedWithEveryStay: string
    viewAllRooms: string
    reserveArrow: string
    roomsPreparedSoon: string
    guestExperiences: string
    wordsFromGuests: string
    reviewCount: (count: number) => string
    reviewsFallbackSubtitle: string
    viewAllReviews: string
    reviewYourStay: string
    verified: string
    stayedRecentlyTitle: string
    stayedRecentlyDesc: string
    bookARoom: string
    checkStatus: string
    sanctuaryPhotosSoon: string
    prevHeroSlide: string
    nextHeroSlide: string
    playSlideshow: string
    pauseSlideshow: string
    heroSlidesLabel: string
    goToSlide: (slideNumber: number) => string
  }
  roomsPage: {
    eyebrow: string
    defaultTitle: string
    defaultSubtitle: string
    roomType: string
    search: string
    clear: string
    emptyMessage: string
    viewAndReserve: string
  }
  roomDetail: {
    notFoundTitle: string
    notFoundDesc: string
    backToRooms: string
    allRooms: string
    roomAmenities: string
    selectBothDatesError: string
    reservationReceived: string
    saveReferenceHint: string
    bookingReference: string
    duration: string
    stayDatesLabel: string
    totalStay: string
    billedAsPhp: (formattedPeso: string) => string
    paymentInstructions: string
    trackBookingStatus: string
    includedGuests: (capacity: number) => string
    firstName: string
    lastName: string
    mobilePhone: string
    emailOptional: string
    specialRequests: string
    specialRequestsPlaceholder: string
    extraAdultsSummary: (count: number) => string
    extraChildrenSummary: (count: number) => string
    approxCurrencyNote: (currency: string, formattedPeso: string) => string
    submittingRequest: string
    requestReservation: string
  }
  bookingLookup: {
    eyebrow: string
    title: string
    subtitle: string
    bookingReference: string
    phoneOrEmail: string
    phoneOrEmailPlaceholder: string
    searching: string
    findReservation: string
    notFoundMessage: string
    reference: string
    guest: string
    room: string
    checkIn: string
    checkOut: string
    totalAmount: string
    amountPaid: string
    remainingBalance: string
    officialBillingNote: (currency: string, formattedPeso: string) => string
    paymentInstructions: string
    thankYouReview: string
    yourStayReview: string
    published: string
    archived: string
    pendingApproval: string
    reviewReceivedNote: string
    verifiedGuestReview: string
    howWasYourStay: string
    reviewingAs: (guestName: string, roomName: string, ref: string) => string
    yourRating: string
    rateStarAria: (stars: number) => string
    fromOptional: string
    fromPlaceholder: string
    headlineOptional: string
    headlinePlaceholder: string
    yourReview: string
    yourReviewPlaceholder: string
    submittingReview: string
    submitVerifiedReview: string
    postStayEligibilityNote: string
  }
  explore: {
    eyebrow: string
    unavailableTitle: string
    unavailableDesc: string
    returnToSanctuary: string
    allSpots: (count: number) => string
    photoCount: (count: number) => string
    distance: string
    bestTime: string
    feeAccess: string
    guestTip: string
    stayAtJwh: string
    returnToQuiet: string
    bookDirectDesc: string
  }
  gallery: {
    eyebrow: string
    unavailableTitle: string
    unavailableDesc: string
    picturesHeading: string
    photoCount: (count: number) => string
    exploreAllPictures: string
    browseRooms: string
    curatingTitle: string
    curatingDesc: string
  }
  reviewsPage: {
    eyebrow: string
    title: string
    subtitle: string
    verifiedPrompt: string
    reviewYourStay: string
    noReviewsYet: string
    basedOnReviews: (count: number, allVerified: boolean) => string
    showingStarReviews: (stars: number) => string
    showAllReviews: string
    verifiedStay: string
    hostResponse: string
    emptyTitle: string
    emptyStarTitle: (stars: number) => string
    allFilter: (count: number) => string
    emptyStarDesc: string
    emptyDesc: string
    stayedInRoom: (roomName: string) => string
  }
  contactPage: {
    eyebrow: string
    defaultTitle: string
    defaultSubtitle: string
    address: string
    viewOnMap: string
    phoneMobile: string
    frontDeskNote: string
    email: string
    emailNote: string
    stayHours: string
    googleMap: string
    findUsTitle: string
    openInGoogleMaps: string
    portFerryTitle: string
    ferryDetailNote: string
    reservationPaymentTitle: string
    browseRooms: string
  }
  chat: {
    onlineStatus: string
    awayStatus: string
    newBtn: string
    connecting: string
    onlineIntro: string
    awayIntro: string
    quickQuestions: string
    quickTopics: readonly [string, string, string, string]
    yourName: string
    email: string
    phoneViber: string
    followUpHint: string
    message: string
    messagePlaceholder: string
    back: string
    sending: string
    startLiveChat: string
    sendInquiry: string
    offlineSavedBanner: string
    you: string
    resolvedNotice: string
    writeMessagePlaceholder: string
    close: string
    chatWithUs: string
    openChatAria: string
    closeChatAria: string
    sendMessageAria: string
  }
  cookies: {
    bannerBody: string
    cookiePreferences: string
    agree: string
    privacyCenterTitle: string
    closePrivacyCenterAria: string
    readPrivacyNotice: string
    hidePrivacyNotice: string
    manageConsentPreferences: string
    alwaysActive: string
    essentialOnly: string
    allowAll: string
    confirmChoices: string
    toggleCategoryAria: (title: string) => string
    categories: {
      necessary: { title: string; description: string }
      functional: { title: string; description: string }
      performance: { title: string; description: string }
      targeting: { title: string; description: string }
    }
  }
  validation: FieldValidationMessages & {
    followUpContactRequired: string
    firstNameLabel: string
    lastNameLabel: string
    fullNameLabel: string
    emailLabel: string
    specialRequestsLabel: string
    messageLabel: string
    fromLabel: string
    headlineLabel: string
    reviewCommentLabel: string
  }
}

export const TRANSLATIONS: Record<LocaleCode, TranslationDictionary> = {
  en: {
    nav: {
      sanctuary: 'Sanctuary',
      rooms: 'Rooms',
      exploreCamotes: 'Explore Camotes',
      bookingStatus: 'Booking Status',
      more: 'More',
      morePagesLabel: 'More pages',
      photoGallery: 'Photo Gallery',
      photoGalleryDesc: 'Spaces & daily life at the haven',
      guestReviews: 'Guest Reviews',
      guestReviewsDesc: 'Ratings & stories from past stays',
      googleMap: 'Google Map',
      googleMapDesc: 'Directions to Santiago Bay, Camotes',
      contactUs: 'Contact Us',
      contactUsDesc: 'Phone, email, hours & port guide',
      languageLabel: 'Language',
      selectLanguageLabel: 'Display Language',
    },
    currency: {
      mobileLabel: 'Currency / Country Rate',
      displayRatesIn: 'Display Rates In',
      billingHint:
        'Converted from PHP for guest convenience. Reservations are billed in PHP (₱).',
    },
    footer: {
      defaultTagline:
        'A quiet rooms-only coastal retreat on Camotes Island, Cebu, designed for unhurried island stays.',
      locationAndContact: 'Location & Contact',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guestServices: 'Guest Services',
      browseRoomsAndRates: 'Browse Rooms & Rates',
      camotesIslandGuide: 'Camotes Island Guide',
      checkBookingStatus: 'Check Booking Status',
      photoGallery: 'Photo Gallery',
      guestReviews: 'Guest Reviews',
      googleMapAndDirections: 'Google Map & Directions',
      contactUs: 'Contact Us',
      cookiePreferences: 'Cookie Preferences',
      staffPortal: 'Staff Portal',
    },
    common: {
      guests: 'Guests',
      any: 'Any',
      guestCount: (n) => `${n} ${n === 1 ? 'Guest' : 'Guests'}`,
      guestsPlusCount: (n) => `${n}+ ${n === 1 ? 'Guest' : 'Guests'}`,
      upToGuests: (n) => `Up to ${n} guests`,
      maxGuests: (n) => `Max ${n} guests`,
      perNight: '/ night',
      nightCount: (n) => `${n} ${n === 1 ? 'night' : 'nights'}`,
      roomNumber: (num) => `Room ${num}`,
      roomTypes: {
        ALL: 'All Room Types',
        Standard: 'Standard',
        Deluxe: 'Deluxe',
        'Whole House': 'Whole House',
      },
      bookingStatuses: {
        PENDING: 'Pending',
        CONFIRMED: 'Confirmed',
        CHECKED_IN: 'Checked In',
        CHECKED_OUT: 'Checked Out',
        CANCELLED: 'Cancelled',
      },
      paymentStatuses: {
        UNPAID: 'Unpaid',
        PARTIAL: 'Partial',
        PAID: 'Paid',
        REFUNDED: 'Refunded',
      },
      reviewRatings: {
        1: 'Needs improvement',
        2: 'Fair stay',
        3: 'Good stay',
        4: 'Very good stay',
        5: 'Wonderful sanctuary',
      },
      ratingOutOfFive: (n) => `${n} out of 5 stars`,
    },
    datePicker: {
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      addDate: 'Add date',
      selectCheckIn: 'Select your check-in date',
      selectCheckOut: 'Select your check-out date',
      nightsSelected: (n) => `${n} ${n === 1 ? 'night' : 'nights'} selected`,
      bookedUnavailable: 'Booked / Unavailable',
      clearDates: 'Clear dates',
      done: 'Done',
      cannotCrossBooked: (d) =>
        `Cannot cross booked dates — started new check-in on ${d}.`,
    },
    extraGuests: {
      additionalPersonsOptional: 'Additional Persons (Optional)',
      adult: 'Adult',
      child: 'Child',
    },
    home: {
      checkAvailability: 'Check Availability',
      theSanctuary: 'The Sanctuary',
      allPictures: 'All Pictures',
      includedWithEveryStay: 'Included With Every Stay',
      viewAllRooms: 'View All Rooms',
      reserveArrow: 'Reserve →',
      roomsPreparedSoon:
        'Rooms are currently being prepared. Please check back shortly.',
      guestExperiences: 'Guest Experiences',
      wordsFromGuests: 'Words From Our Guests',
      reviewCount: (n) => `${n} ${n === 1 ? 'review' : 'reviews'}`,
      reviewsFallbackSubtitle:
        'Reflections from travelers who have unwound with us on Camotes Island.',
      viewAllReviews: 'View All Reviews',
      reviewYourStay: 'Review Your Stay',
      verified: 'Verified',
      stayedRecentlyTitle: "Stayed at Jenny's White Haven recently?",
      stayedRecentlyDesc:
        'We would love to hear about your island stay. Share a short note about your room and experience for future guests.',
      bookARoom: 'Book a Room',
      checkStatus: 'Check Status',
      sanctuaryPhotosSoon:
        'Sanctuary photo highlights will be shared here soon.',
      prevHeroSlide: 'Previous hero slide',
      nextHeroSlide: 'Next hero slide',
      playSlideshow: 'Play hero slideshow',
      pauseSlideshow: 'Pause hero slideshow',
      heroSlidesLabel: 'Hero slides',
      goToSlide: (n) => `Go to slide ${n}`,
    },
    roomsPage: {
      eyebrow: 'Accommodations',
      defaultTitle: 'Sanctuaries by the Shore',
      defaultSubtitle:
        'Select your preferred dates and room style to check live availability.',
      roomType: 'Room Type',
      search: 'Search',
      clear: 'Clear',
      emptyMessage:
        'No rooms match your selected dates or filters. Try adjusting your search.',
      viewAndReserve: 'View & Reserve →',
    },
    roomDetail: {
      notFoundTitle: 'Room Not Found',
      notFoundDesc: 'This accommodation is no longer available.',
      backToRooms: 'Back to Rooms',
      allRooms: 'All Rooms',
      roomAmenities: 'Room Amenities',
      selectBothDatesError: 'Please select both check-in and check-out dates.',
      reservationReceived: 'Reservation Request Received',
      saveReferenceHint:
        'Save your booking reference below to check your status at any time.',
      bookingReference: 'Booking Reference',
      duration: 'Duration',
      stayDatesLabel: 'Stay Dates',
      totalStay: 'Total Stay',
      billedAsPhp: (peso) => `Billed as ${peso} PHP`,
      paymentInstructions: 'Payment Instructions',
      trackBookingStatus: 'Track Booking Status',
      includedGuests: (cap) => `Included Guests (Up to ${cap})`,
      firstName: 'First Name *',
      lastName: 'Last Name *',
      mobilePhone: 'Mobile / Phone Number *',
      emailOptional: 'Email (Optional)',
      specialRequests: 'Special Requests',
      specialRequestsPlaceholder: 'Port pickup, early check-in, etc.',
      extraAdultsSummary: (n) => `+${n} extra ${n === 1 ? 'adult' : 'adults'}`,
      extraChildrenSummary: (n) =>
        `+${n} extra ${n === 1 ? 'child' : 'children'}`,
      approxCurrencyNote: (currency, peso) =>
        `Approx. in ${currency} (from ${peso} PHP) · Reservations are billed in PHP.`,
      submittingRequest: 'Submitting Request...',
      requestReservation: 'Request Reservation',
    },
    bookingLookup: {
      eyebrow: 'Guest Lookup',
      title: 'Check Booking Status',
      subtitle:
        'Enter your booking reference and the phone number or email used when reserving.',
      bookingReference: 'Booking Reference',
      phoneOrEmail: 'Phone Number or Email',
      phoneOrEmailPlaceholder: '+63 9XX XXX XXXX or guest@email.com',
      searching: 'Searching...',
      findReservation: 'Find Reservation',
      notFoundMessage:
        'No matching reservation was found. Please verify your booking reference and contact details.',
      reference: 'Reference',
      guest: 'Guest',
      room: 'Room',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      totalAmount: 'Total Amount',
      amountPaid: 'Amount Paid',
      remainingBalance: 'Remaining Balance',
      officialBillingNote: (currency, peso) =>
        `Approx. in ${currency} · Official billing total: ${peso} PHP.`,
      paymentInstructions: 'Payment Instructions',
      thankYouReview: 'Thank you for reviewing your stay!',
      yourStayReview: 'Your Stay Review',
      published: 'Published',
      archived: 'Archived',
      pendingApproval: 'Pending Approval',
      reviewReceivedNote:
        'Your verified review has been received and will appear on our Guest Reviews page once approved by our team.',
      verifiedGuestReview: 'Verified Guest Review',
      howWasYourStay: "How Was Your Stay at Jenny's White Haven?",
      reviewingAs: (guest, room, ref) =>
        `Reviewing as ${guest} for ${room} (${ref}).`,
      yourRating: 'Your Rating *',
      rateStarAria: (n) => `Rate ${n} out of 5 stars`,
      fromOptional: 'From (Optional)',
      fromPlaceholder: 'e.g., Cebu City',
      headlineOptional: 'Headline (Optional)',
      headlinePlaceholder: 'Peaceful mornings by Santiago Bay',
      yourReview: 'Your Review *',
      yourReviewPlaceholder:
        'Share what you loved about your room, the island atmosphere, or our hospitality...',
      submittingReview: 'Submitting Review...',
      submitVerifiedReview: 'Submit Verified Review',
      postStayEligibilityNote:
        'Once your stay is completed (Checked Out) and fully paid (Paid), you can return to this page to submit a verified review for your stay.',
    },
    explore: {
      eyebrow: 'Island Guide · Camotes, Cebu',
      unavailableTitle: 'Camotes Island Guide Unavailable',
      unavailableDesc:
        'Our island destination guide is currently hidden while we update recommendations for your stay. Browse our rooms or reach out to our team for local travel tips.',
      returnToSanctuary: 'Return to Sanctuary',
      allSpots: (n) => `All Spots (${n})`,
      photoCount: (n) => `${n} ${n === 1 ? 'Photo' : 'Photos'}`,
      distance: 'Distance',
      bestTime: 'Best Time',
      feeAccess: 'Fee / Access',
      guestTip: 'Guest Tip',
      stayAtJwh: "Stay at Jenny's White Haven",
      returnToQuiet: 'Return to coastal quiet after your island adventure.',
      bookDirectDesc:
        'Book your room directly with us and let our local team help plan your Camotes Island itinerary.',
    },
    gallery: {
      eyebrow: 'Atmosphere',
      unavailableTitle: 'Photo Gallery Unavailable',
      unavailableDesc:
        'Our photo gallery is currently hidden while we refresh our island photography. Browse our rooms or return to the sanctuary overview.',
      picturesHeading: 'Pictures',
      photoCount: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
      exploreAllPictures: 'Explore all pictures',
      browseRooms: 'Browse Rooms',
      curatingTitle: 'Gallery photos are being curated',
      curatingDesc:
        'We are updating our island photography. Browse our suites and rooms in the meantime.',
    },
    reviewsPage: {
      eyebrow: 'Guest Experiences',
      title: 'Stories & Reviews from the Haven',
      subtitle:
        'Authentic reflections from guests who have completed their stay with us on Camotes Island. To protect against spam, reviews can only be submitted by verified guests after checkout and full payment.',
      verifiedPrompt:
        'Stayed with us recently? Look up your completed reservation to leave a verified review.',
      reviewYourStay: 'Review Your Stay',
      noReviewsYet: 'No published reviews yet',
      basedOnReviews: (n, verified) =>
        `Based on ${n} ${verified ? 'verified' : 'published'} ${n === 1 ? 'review' : 'reviews'}`,
      showingStarReviews: (stars) => `Showing ${stars}-star reviews`,
      showAllReviews: 'Show all reviews',
      verifiedStay: 'Verified Stay',
      hostResponse: "Response from Jenny's White Haven",
      emptyTitle: 'No published guest reviews yet',
      emptyStarTitle: (stars) => `No ${stars}-star reviews yet`,
      allFilter: (n) => `All (${n})`,
      emptyStarDesc:
        'Try clearing the star filter to see all published guest stories.',
      emptyDesc:
        'Completed a stay with us? Enter your booking reference on the Booking Status page to share your experience.',
      stayedInRoom: (room) => `Stayed in ${room}`,
    },
    contactPage: {
      eyebrow: 'Contact & Location',
      defaultTitle: 'Plan your visit to Camotes Island.',
      defaultSubtitle:
        'Have questions about ferry schedules, room requests, or group stays? Reach out anytime.',
      address: 'Address',
      viewOnMap: 'View on map ↓',
      phoneMobile: 'Phone / Mobile',
      frontDeskNote: 'Daily front-desk & transfer assistance',
      email: 'Email',
      emailNote: 'We respond promptly to stay inquiries',
      stayHours: 'Stay Hours',
      googleMap: 'Google Map',
      findUsTitle: 'Find Us on Camotes Island',
      openInGoogleMaps: 'Open in Google Maps',
      portFerryTitle: 'Port & Ferry Arrival Notes',
      ferryDetailNote:
        'Arriving via Danao Port (Jomalia Shipping) or Cebu Pier 1 (OceanJet)? Share your ferry time when booking so we can help arrange a local multicab or motorbike transfer directly to the haven.',
      reservationPaymentTitle: 'Reservation & Payment Details',
      browseRooms: 'Browse Rooms',
    },
    chat: {
      onlineStatus: "We're Online · Replies in a few minutes",
      awayStatus: 'Currently Away · Leave a message anytime',
      newBtn: 'New',
      connecting: 'Connecting to resort desk...',
      onlineIntro:
        'Ask our island desk about room availability, rates, or Camotes ferry transfers.',
      awayIntro:
        'Our team is currently away from the desk. Leave your question and contact details below—we will notify our team immediately and reply by chat and email.',
      quickQuestions: 'Quick Questions',
      quickTopics: [
        'Is our preferred date available?',
        'Whole House rate & capacity',
        'Port pickup from Consuelo / Poro',
        'Check-in & check-out times',
      ],
      yourName: 'Your Name *',
      email: 'Email',
      phoneViber: 'Phone / Viber',
      followUpHint:
        'Provide email or phone so we can follow up if you leave this page.',
      message: 'Message *',
      messagePlaceholder: 'Hello! We are planning a 2-night stay...',
      back: 'Back',
      sending: 'Sending...',
      startLiveChat: 'Start Live Chat',
      sendInquiry: 'Send Inquiry',
      offlineSavedBanner:
        "Our team has been notified via app & email. Feel free to add details—your chat stays saved here, and we'll also email our reply if you step away.",
      you: 'You',
      resolvedNotice:
        'This inquiry was marked resolved. Send a message below to reopen it anytime.',
      writeMessagePlaceholder: 'Write a message...',
      close: 'Close',
      chatWithUs: 'Chat with us',
      openChatAria: 'Open chat support',
      closeChatAria: 'Close chat support',
      sendMessageAria: 'Send message',
    },
    cookies: {
      bannerBody:
        "We use cookies and local browser storage to keep your reservation session secure, remember your stay preferences, and understand how guests explore Jenny's White Haven. By clicking Agree or configuring Cookie Preferences, you acknowledge our privacy practices in accordance with the Philippine Data Privacy Act of 2012 (RA 10173).",
      cookiePreferences: 'Cookie Preferences',
      agree: 'Agree',
      privacyCenterTitle: 'Privacy Preferences Center',
      closePrivacyCenterAria: 'Close privacy preferences center',
      readPrivacyNotice: 'Read Privacy & Cookie Notice',
      hidePrivacyNotice: 'Hide Privacy & Cookie Notice',
      manageConsentPreferences: 'Manage Consent Preferences',
      alwaysActive: 'Always Active',
      essentialOnly: 'Essential Only',
      allowAll: 'Allow All',
      confirmChoices: 'Confirm My Choices',
      toggleCategoryAria: (title) => `Toggle ${title}`,
      categories: {
        necessary: {
          title: 'Strictly Necessary Cookies',
          description:
            'Essential for the website to function properly, including room availability searches, reservation form security, payment proof uploads, and remembering your privacy preferences. These cookies cannot be switched off.',
        },
        functional: {
          title: 'Functional Cookies',
          description:
            'Allow the website to remember choices you make during your visit—such as selected check-in and check-out dates, guest count, and display preferences—to provide a smoother booking experience.',
        },
        performance: {
          title: 'Performance Cookies',
          description:
            'Help us understand how guests navigate our rooms and Camotes Island guide by collecting anonymous, aggregated traffic statistics so we can improve page speed and usability.',
        },
        targeting: {
          title: 'Targeting Cookies',
          description:
            'Used to measure the effectiveness of our travel promotions and share relevant staycation updates on social platforms. If disabled, you will not receive targeted promotions from this site.',
        },
      },
    },
    validation: {
      required: (field) => `${field} is required.`,
      nameNoNumbers: (field) => `${field} cannot contain numbers.`,
      nameInvalidChars: (field) =>
        `${field} can only contain letters, spaces, hyphens, and apostrophes.`,
      nameLength: (field, min, max) =>
        `${field} must be between ${min} and ${max} characters.`,
      invalidEmail: 'Please enter a valid email address.',
      phoneRequired: 'Phone number is required.',
      phoneInvalidLength: (countryName, dialCode, min, max) =>
        min === max
          ? `Please enter a valid ${countryName} (${dialCode}) phone number (${min} digits).`
          : `Please enter a valid ${countryName} (${dialCode}) phone number (${min}–${max} digits).`,
      phoneIntlInvalidLength:
        'Please enter a valid international phone number (7–15 digits including country code).',
      maxLengthExceeded: (field, max) =>
        `${field} must be ${max} characters or fewer.`,
      minLengthRequired: (field, min) =>
        `${field} must be at least ${min} characters.`,
      invalidBookingReference:
        'Booking reference should look like JWH-20261128-XXXX (letters, numbers, and hyphens only).',
      invalidLookupContact:
        'Enter the registered email address or phone number used when booking.',
      invalidNationality:
        'Nationality must be 2–60 letters without numbers or special symbols.',
      idTypeRequiredForNumber: 'Please select an ID type for the ID number.',
      invalidIdNumber:
        'ID number must be 2–40 alphanumeric characters (letters, numbers, spaces, hyphens, or slashes).',
      invalidLocation:
        'Location must be 2–80 characters and cannot include HTML or special symbols.',
      followUpContactRequired:
        'Please provide an email address or phone number so we can follow up.',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      fullNameLabel: 'Name',
      emailLabel: 'Email address',
      specialRequestsLabel: 'Special requests',
      messageLabel: 'Message',
      fromLabel: 'City / Country',
      headlineLabel: 'Headline',
      reviewCommentLabel: 'Your review',
    },
  },

  ko: {
    nav: {
      sanctuary: '생추어리',
      rooms: '객실 안내',
      exploreCamotes: '카모테스 여행 가이드',
      bookingStatus: '예약 조회',
      more: '더보기',
      morePagesLabel: '추가 메뉴',
      photoGallery: '포토 갤러리',
      photoGalleryDesc: '리조트 공간과 섬의 일상 풍경',
      guestReviews: '투숙객 후기',
      guestReviewsDesc: '인증된 투숙객의 평점과 이야기',
      googleMap: '구글 지도',
      googleMapDesc: '카모테스 산티아고 베이 오시는 길',
      contactUs: '문의하기',
      contactUsDesc: '전화, 이메일, 체크인 시간 및 항구 안내',
      languageLabel: '언어 선택',
      selectLanguageLabel: '표시 언어',
    },
    currency: {
      mobileLabel: '통화 / 환율 표시',
      displayRatesIn: '표시 통화 선택',
      billingHint:
        '편의를 위해 PHP 기준 예상 환율로 표시됩니다. 실제 결제는 필리핀 페소(PHP, ₱)로 진행됩니다.',
    },
    footer: {
      defaultTagline:
        '세부 카모테스 섬의 고요한 해안가에 자리한 프라이빗 스테이케이션 리조트입니다.',
      locationAndContact: '위치 및 연락처',
      checkIn: '체크인',
      checkOut: '체크아웃',
      guestServices: '게스트 서비스',
      browseRoomsAndRates: '객실 및 요금 보기',
      camotesIslandGuide: '카모테스 섬 가이드',
      checkBookingStatus: '예약 상태 확인',
      photoGallery: '포토 갤러리',
      guestReviews: '투숙객 후기',
      googleMapAndDirections: '구글 지도 및 오시는 길',
      contactUs: '문의하기',
      cookiePreferences: '쿠키 설정',
      staffPortal: '직원 전용 포털',
    },
    common: {
      guests: '투숙 인원',
      any: '전체',
      guestCount: (n) => `성인/투숙객 ${n}명`,
      guestsPlusCount: (n) => `${n}명 이상`,
      upToGuests: (n) => `최대 ${n}명`,
      maxGuests: (n) => `최대 ${n}명`,
      perNight: '/ 1박',
      nightCount: (n) => `${n}박`,
      roomNumber: (num) => `객실 ${num}`,
      roomTypes: {
        ALL: '전체 객실 유형',
        Standard: '스탠다드',
        Deluxe: '디럭스',
        'Whole House': '독채 전체 대관',
      },
      bookingStatuses: {
        PENDING: '예약 대기',
        CONFIRMED: '예약 확정',
        CHECKED_IN: '체크인 완료',
        CHECKED_OUT: '체크아웃 완료',
        CANCELLED: '예약 취소',
      },
      paymentStatuses: {
        UNPAID: '미결제',
        PARTIAL: '부분 결제',
        PAID: '결제 완료',
        REFUNDED: '환불 완료',
      },
      reviewRatings: {
        1: '아쉬운 숙박',
        2: '무난한 숙박',
        3: '만족스러운 숙박',
        4: '매우 훌륭한 숙박',
        5: '최고의 힐링 안식처',
      },
      ratingOutOfFive: (n) => `별점 5점 만점에 ${n}점`,
    },
    datePicker: {
      checkIn: '체크인',
      checkOut: '체크아웃',
      addDate: '날짜 선택',
      selectCheckIn: '체크인 날짜를 선택해 주세요',
      selectCheckOut: '체크아웃 날짜를 선택해 주세요',
      nightsSelected: (n) => `${n}박 선택됨`,
      bookedUnavailable: '예약 마감 / 선택 불가',
      clearDates: '날짜 초기화',
      done: '선택 완료',
      cannotCrossBooked: (d) =>
        `예약 마감된 날짜를 포함할 수 없어 ${d}부터 새 체크인으로 설정되었습니다.`,
    },
    extraGuests: {
      additionalPersonsOptional: '추가 인원 (선택 사항)',
      adult: '성인 추가',
      child: '어린이 추가',
    },
    home: {
      checkAvailability: '객실 조회',
      theSanctuary: '더 생추어리',
      allPictures: '전체 사진 보기',
      includedWithEveryStay: '모든 투숙 기본 제공 혜택',
      viewAllRooms: '전체 객실 보기',
      reserveArrow: '예약하기 →',
      roomsPreparedSoon: '현재 객실 정보를 준비 중입니다. 잠시 후 다시 확인해 주세요.',
      guestExperiences: '투숙객 경험',
      wordsFromGuests: '투숙객이 전하는 이야기',
      reviewCount: (n) => `후기 ${n}개`,
      reviewsFallbackSubtitle:
        '카모테스 섬에서 여유로운 시간을 보낸 여행자들의 생생한 후기입니다.',
      viewAllReviews: '후기 전체 보기',
      reviewYourStay: '숙박 후기 남기기',
      verified: '숙박 인증',
      stayedRecentlyTitle: "최근 Jenny's White Haven에 머무셨나요?",
      stayedRecentlyDesc:
        '소중한 섬 여행의 기억을 다음 여행자들과 나누어 주세요.',
      bookARoom: '객실 예약하기',
      checkStatus: '예약 조회',
      sanctuaryPhotosSoon: '생추어리 주요 사진이 곧 업데이트됩니다.',
      prevHeroSlide: '이전 배너 슬라이드',
      nextHeroSlide: '다음 배너 슬라이드',
      playSlideshow: '슬라이드쇼 재생',
      pauseSlideshow: '슬라이드쇼 일시정지',
      heroSlidesLabel: '메인 슬라이드 목록',
      goToSlide: (n) => `${n}번 슬라이드로 이동`,
    },
    roomsPage: {
      eyebrow: '객실 안내',
      defaultTitle: '해안가의 평화로운 안식처',
      defaultSubtitle:
        '원하시는 일정과 객실 유형을 선택해 실시간 예약 가능 여부를 확인하세요.',
      roomType: '객실 유형',
      search: '검색',
      clear: '초기화',
      emptyMessage:
        '선택하신 일정이나 조건에 맞는 객실이 없습니다. 날짜나 조건을 변경해 보세요.',
      viewAndReserve: '상세 보기 및 예약 →',
    },
    roomDetail: {
      notFoundTitle: '객실을 찾을 수 없습니다',
      notFoundDesc: '현재 이용할 수 없는 객실입니다.',
      backToRooms: '객실 목록으로 돌아가기',
      allRooms: '전체 객실',
      roomAmenities: '객실 편의시설',
      selectBothDatesError: '체크인 및 체크아웃 날짜를 모두 선택해 주세요.',
      reservationReceived: '예약 요청이 접수되었습니다',
      saveReferenceHint:
        '언제든 예약 상태를 조회하실 수 있도록 아래 예약 번호를 꼭 보관해 주세요.',
      bookingReference: '예약 번호',
      duration: '숙박 기간',
      stayDatesLabel: '투숙 일정',
      totalStay: '총 예상 요금',
      billedAsPhp: (peso) => `실제 결제 금액: ${peso} PHP`,
      paymentInstructions: '입금 및 결제 안내',
      trackBookingStatus: '예약 상태 조회하기',
      includedGuests: (cap) => `기본 포함 인원 (최대 ${cap}명)`,
      firstName: '이름 (First Name) *',
      lastName: '성 (Last Name) *',
      mobilePhone: '휴대폰 번호 *',
      emailOptional: '이메일 (선택)',
      specialRequests: '특별 요청 사항',
      specialRequestsPlaceholder: '항구 픽업 요청, 얼리 체크인 문의 등',
      extraAdultsSummary: (n) => `+성인 추가 ${n}명`,
      extraChildrenSummary: (n) => `+어린이 추가 ${n}명`,
      approxCurrencyNote: (currency, peso) =>
        `${currency} 기준 예상 금액 (원금 ${peso} PHP) · 최종 결제는 PHP로 청구됩니다.`,
      submittingRequest: '예약 요청 전송 중...',
      requestReservation: '예약 요청하기',
    },
    bookingLookup: {
      eyebrow: '예약 조회',
      title: '예약 상태 확인',
      subtitle:
        '예약 시 발급된 예약 번호와 등록하신 휴대폰 번호 또는 이메일을 입력해 주세요.',
      bookingReference: '예약 번호',
      phoneOrEmail: '휴대폰 번호 또는 이메일',
      phoneOrEmailPlaceholder: '+82 10 XXXX XXXX 또는 guest@email.com',
      searching: '조회 중...',
      findReservation: '예약 조회하기',
      notFoundMessage:
        '일치하는 예약 내역이 없습니다. 예약 번호와 연락처를 다시 확인해 주세요.',
      reference: '예약 번호',
      guest: '투숙객 성함',
      room: '객실',
      checkIn: '체크인',
      checkOut: '체크아웃',
      totalAmount: '총 객실 요금',
      amountPaid: '결제 완료 금액',
      remainingBalance: '잔여 결제 금액',
      officialBillingNote: (currency, peso) =>
        `${currency} 환산 참고 금액 · 공식 청구 총액: ${peso} PHP.`,
      paymentInstructions: '입금 및 결제 안내',
      thankYouReview: '소중한 숙박 후기를 남겨주셔서 감사합니다!',
      yourStayReview: '작성하신 숙박 후기',
      published: '게시됨',
      archived: '보관됨',
      pendingApproval: '승인 대기 중',
      reviewReceivedNote:
        '인증된 후기가 정상 접수되었으며, 관리자 확인 후 투숙객 후기 페이지에 게시됩니다.',
      verifiedGuestReview: '실투숙 인증 후기',
      howWasYourStay: "Jenny's White Haven에서의 시간은 어떠셨나요?",
      reviewingAs: (guest, room, ref) =>
        `${guest}님 · ${room} (${ref}) 투숙 후기 작성`,
      yourRating: '별점 평가 *',
      rateStarAria: (n) => `별점 5점 중 ${n}점 선택`,
      fromOptional: '거주 도시/국가 (선택)',
      fromPlaceholder: '예: 서울, 대한민국',
      headlineOptional: '한 줄 제목 (선택)',
      headlinePlaceholder: '산티아고 베이의 평화로운 아침',
      yourReview: '상세 후기 *',
      yourReviewPlaceholder:
        '객실 컨디션, 섬의 분위기, 서비스 등 좋았던 점을 자유롭게 남겨주세요...',
      submittingReview: '후기 등록 중...',
      submitVerifiedReview: '인증 후기 등록하기',
      postStayEligibilityNote:
        '숙박 완료(체크아웃) 및 전액 결제가 확인된 후 이 페이지에서 실투숙 인증 후기를 작성하실 수 있습니다.',
    },
    explore: {
      eyebrow: '아일랜드 가이드 · 세부 카모테스',
      unavailableTitle: '카모테스 여행 가이드 준비 중',
      unavailableDesc:
        '더 알찬 현지 추천 코스를 위해 가이드를 업데이트하고 있습니다. 객실을 둘러보시거나 채팅으로 현지 여행 팁을 문의해 주세요.',
      returnToSanctuary: '홈으로 돌아가기',
      allSpots: (n) => `전체 명소 (${n})`,
      photoCount: (n) => `사진 ${n}장`,
      distance: '이동 거리',
      bestTime: '추천 시간',
      feeAccess: '입장료 / 이용 안내',
      guestTip: '여행 팁',
      stayAtJwh: "Jenny's White Haven 숙박 안내",
      returnToQuiet: '섬 투어 후 고요한 해변 안식처에서 휴식하세요.',
      bookDirectDesc:
        '공식 웹사이트에서 직접 객실을 예약하시면 현지 팀이 카모테스 섬 여행 일정을 친절히 도와드립니다.',
    },
    gallery: {
      eyebrow: '리조트 무드',
      unavailableTitle: '포토 갤러리 업데이트 중',
      unavailableDesc:
        '새로운 리조트 사진을 준비하고 있습니다. 객실 안내 페이지를 먼저 확인해 보세요.',
      picturesHeading: '포토 갤러리',
      photoCount: (n) => `사진 ${n}장`,
      exploreAllPictures: '전체 사진 크게 보기',
      browseRooms: '객실 둘러보기',
      curatingTitle: '포토 갤러리 사진 준비 중',
      curatingDesc:
        '새로운 리조트 풍경 사진을 업데이트하고 있습니다. 먼저 객실 안내 페이지를 둘러보세요.',
    },
    reviewsPage: {
      eyebrow: '투숙객 경험',
      title: '투숙객 후기 및 이야기',
      subtitle:
        '카모테스 섬에서 투숙을 마친 실제 게스트분들의 솔직한 후기입니다. 스팸 방지를 위해 체크아웃 및 결제가 완료된 예약자만 후기를 작성할 수 있습니다.',
      verifiedPrompt:
        '최근 투숙하셨나요? 완료된 예약을 조회하여 인증 후기를 남겨보세요.',
      reviewYourStay: '후기 작성하기',
      noReviewsYet: '아직 게시된 후기가 없습니다',
      basedOnReviews: (n, verified) =>
        `${verified ? '실투숙 인증' : '게시된'} 후기 ${n}개 기준`,
      showingStarReviews: (stars) => `${stars}점 후기 모아보기`,
      showAllReviews: '전체 후기 보기',
      verifiedStay: '실투숙 인증',
      hostResponse: "Jenny's White Haven 호스트 답변",
      emptyTitle: '곧 투숙객 후기가 업데이트됩니다',
      emptyStarTitle: (stars) => `아직 ${stars}점 후기가 없습니다`,
      allFilter: (n) => `전체 (${n})`,
      emptyStarDesc:
        '별점 필터를 해제하시면 게시된 전체 후기를 확인하실 수 있습니다.',
      emptyDesc:
        '숙박을 마치셨나요? 예약 조회 페이지에서 예약 번호를 입력해 소중한 후기를 남겨보세요.',
      stayedInRoom: (room) => `${room} 투숙`,
    },
    contactPage: {
      eyebrow: '오시는 길 및 문의',
      defaultTitle: '카모테스 섬 여행을 계획해 보세요.',
      defaultSubtitle:
        '페리 시간표, 객실 문의, 단체 대관 등 궁금한 점이 있으시면 언제든 연락해 주세요.',
      address: '주소',
      viewOnMap: '지도에서 보기 ↓',
      phoneMobile: '전화 / 모바일',
      frontDeskNote: '프런트 데스크 및 항구 픽업 안내',
      email: '이메일',
      emailNote: '숙박 문의에 신속히 답변해 드립니다',
      stayHours: '이용 시간',
      googleMap: '구글 지도',
      findUsTitle: '카모테스 섬 오시는 길',
      openInGoogleMaps: 'Google 지도에서 열기',
      portFerryTitle: '항구 및 페리 도착 안내',
      ferryDetailNote:
        '다나오 항구(Jomalia Shipping) 또는 세부 피어 1(OceanJet)을 이용하시나요? 예약 시 페리 도착 시간을 알려주시면 콘수엘로/포로 항구 픽업 차량 연결을 도와드립니다.',
      reservationPaymentTitle: '예약 및 결제 안내',
      browseRooms: '객실 둘러보기',
    },
    chat: {
      onlineStatus: '상담 가능 · 몇 분 내 빠른 답변',
      awayStatus: '자리 비움 · 메시지를 남겨주시면 곧 답변드립니다',
      newBtn: '새 문의',
      connecting: '리조트 데스크에 연결 중...',
      onlineIntro:
        '객실 가능 여부, 독채 요금, 카모테스 페리 픽업 등 무엇이든 편하게 문의하세요.',
      awayIntro:
        '현재 직원이 잠시 자리를 비웠습니다. 문의 내용과 연락처를 남겨주시면 즉시 알림이 전달되어 채팅 및 이메일로 답변해 드립니다.',
      quickQuestions: '자주 묻는 질문',
      quickTopics: [
        '원하는 날짜에 예약 가능한가요?',
        '독채 전체 대관 요금 및 인원 안내',
        '콘수엘로 / 포로 항구 픽업 문의',
        '체크인 및 체크아웃 시간 안내',
      ],
      yourName: '성함 *',
      email: '이메일',
      phoneViber: '휴대폰 번호',
      followUpHint:
        '페이지를 나가셔도 답변을 받으실 수 있도록 이메일 또는 전화번호를 입력해 주세요.',
      message: '문의 내용 *',
      messagePlaceholder: '안녕하세요! 2박 3일 숙박 관련 문의드립니다...',
      back: '이전',
      sending: '전송 중...',
      startLiveChat: '실시간 채팅 시작',
      sendInquiry: '문의 남기기',
      offlineSavedBanner:
        '담당 팀에 앱 및 이메일 알림이 전송되었습니다. 추가 내용을 남겨주셔도 되며, 자리를 비우셔도 이메일로 답변을 보내드립니다.',
      you: '나',
      resolvedNotice:
        '종료된 상담입니다. 아래에 새 메시지를 보내시면 언제든 다시 열립니다.',
      writeMessagePlaceholder: '메시지를 입력하세요...',
      close: '닫기',
      chatWithUs: '실시간 문의',
      openChatAria: '실시간 상담 창 열기',
      closeChatAria: '실시간 상담 창 닫기',
      sendMessageAria: '메시지 보내기',
    },
    cookies: {
      bannerBody:
        "Jenny's White Haven은 안전한 예약 세션 유지, 투숙 환경 설정 저장, 서비스 개선을 위해 쿠키 및 브라우저 저장소를 사용합니다. '동의'를 클릭하거나 '쿠키 설정'을 조정하시면 필리핀 개인정보보호법(RA 10173)에 따른 개인정보 처리 방침에 동의하게 됩니다.",
      cookiePreferences: '쿠키 설정',
      agree: '동의',
      privacyCenterTitle: '개인정보 및 쿠키 설정 센터',
      closePrivacyCenterAria: '쿠키 설정 센터 닫기',
      readPrivacyNotice: '개인정보 및 쿠키 안내 읽기',
      hidePrivacyNotice: '개인정보 및 쿠키 안내 숨기기',
      manageConsentPreferences: '쿠키 동의 항목 관리',
      alwaysActive: '항상 사용',
      essentialOnly: '필수 쿠키만 허용',
      allowAll: '모두 허용',
      confirmChoices: '선택 설정 저장',
      toggleCategoryAria: (title) => `${title} 설정 전환`,
      categories: {
        necessary: {
          title: '필수 쿠키',
          description:
            '객실 조회, 예약 양식 보안, 입금 증빙 업로드 및 개인정보 동의 설정 저장 등 웹사이트의 핵심 기능 작동에 필수적이며 비활성화할 수 없습니다.',
        },
        functional: {
          title: '기능성 쿠키',
          description:
            '선택하신 체크인·체크아웃 날짜, 인원수, 표시 통화 및 언어 설정 등을 기억하여 더욱 편리한 예약 경험을 제공합니다.',
        },
        performance: {
          title: '성능 분석 쿠키',
          description:
            '익명화된 방문 통계를 통해 투숙객이 객실과 카모테스 가이드를 어떻게 탐색하는지 파악하고 페이지 속도와 사용성을 개선합니다.',
        },
        targeting: {
          title: '맞춤형 프로모션 쿠키',
          description:
            '여행 프로모션 효과를 측정하고 소셜 플랫폼에서 관련 숙박 소식을 전달하는 데 사용됩니다. 비활성화 시 맞춤형 프로모션이 표시되지 않습니다.',
        },
      },
    },
    validation: {
      required: (field) => `${field} 항목을 입력해 주세요.`,
      nameNoNumbers: (field) => `${field}에는 숫자를 입력할 수 없습니다.`,
      nameInvalidChars: (field) =>
        `${field}에는 문자, 공백, 하이픈(-), 아포스트로피(')만 입력할 수 있습니다.`,
      nameLength: (field, min, max) =>
        `${field}은(는) ${min}자 이상 ${max}자 이하로 입력해 주세요.`,
      invalidEmail:
        '올바른 이메일 주소를 입력해 주세요 (예: name@example.com).',
      phoneRequired: '휴대폰 번호를 입력해 주세요.',
      phoneInvalidLength: (countryName, dialCode, min, max) =>
        min === max
          ? `${countryName} (${dialCode}) 번호 ${min}자리를 정확히 입력해 주세요.`
          : `${countryName} (${dialCode}) 번호 ${min}~${max}자리를 입력해 주세요.`,
      phoneIntlInvalidLength:
        '국가 번호를 포함해 7~15자리의 올바른 국제 전화번호를 입력해 주세요.',
      maxLengthExceeded: (field, max) =>
        `${field}은(는) 최대 ${max}자까지 입력할 수 있습니다.`,
      minLengthRequired: (field, min) =>
        `${field}은(는) 최소 ${min}자 이상 입력해 주세요.`,
      invalidBookingReference:
        '예약 번호는 JWH-20261128-XXXX 형식(영문, 숫자, 하이픈)으로 입력해 주세요.',
      invalidLookupContact:
        '예약 시 등록한 이메일 주소 또는 휴대폰 번호를 입력해 주세요.',
      invalidNationality:
        '국적은 숫자나 특수문자 없이 2~60자로 입력해 주세요.',
      idTypeRequiredForNumber: '신분증 번호에 해당하는 신분증 종류를 선택해 주세요.',
      invalidIdNumber:
        '신분증 번호는 2~40자의 영문·숫자·공백·하이픈(-)·슬래시(/)만 사용할 수 있습니다.',
      invalidLocation:
        '거주 지역은 특수 기호 없이 2~80자로 입력해 주세요.',
      followUpContactRequired:
        '답변을 받으실 수 있도록 이메일 또는 휴대폰 번호 중 하나를 입력해 주세요.',
      firstNameLabel: '이름',
      lastNameLabel: '성',
      fullNameLabel: '성함',
      emailLabel: '이메일',
      specialRequestsLabel: '특별 요청 사항',
      messageLabel: '문의 내용',
      fromLabel: '거주 도시/국가',
      headlineLabel: '한 줄 제목',
      reviewCommentLabel: '상세 후기',
    },
  },

  ja: {
    nav: {
      sanctuary: 'サンクチュアリ',
      rooms: '客室案内',
      exploreCamotes: 'カモテス島ガイド',
      bookingStatus: '予約確認',
      more: 'その他',
      morePagesLabel: 'その他のページ',
      photoGallery: 'フォトギャラリー',
      photoGalleryDesc: 'リゾートの空間と島の穏やかな日常',
      guestReviews: '宿泊者の口コミ',
      guestReviewsDesc: 'ご滞在いただいたお客様からの評価と感想',
      googleMap: 'Google マップ',
      googleMapDesc: 'カモテス島サンティアゴ・ベイへのアクセス',
      contactUs: 'お問い合わせ',
      contactUsDesc: '電話・メール・営業時間・港からの送迎案内',
      languageLabel: '言語',
      selectLanguageLabel: '表示言語',
    },
    currency: {
      mobileLabel: '通貨 / 参考レート',
      displayRatesIn: '表示通貨を選択',
      billingHint:
        '目安としてPHPから換算表示しています。ご請求・お支払いはフィリピン・ペソ（PHP / ₱）となります。',
    },
    footer: {
      defaultTagline:
        'セブ・カモテス島の静かな海辺に佇む、ゆったりとした島時間のためのプライベート・リトリート。',
      locationAndContact: '所在地・お問い合わせ',
      checkIn: 'チェックイン',
      checkOut: 'チェックアウト',
      guestServices: 'ゲストサービス',
      browseRoomsAndRates: '客室・料金一覧',
      camotesIslandGuide: 'カモテス島観光ガイド',
      checkBookingStatus: '予約状況の確認',
      photoGallery: 'フォトギャラリー',
      guestReviews: '宿泊者の口コミ',
      googleMapAndDirections: 'Google マップ・アクセス',
      contactUs: 'お問い合わせ',
      cookiePreferences: 'Cookie設定',
      staffPortal: 'スタッフポータル',
    },
    common: {
      guests: '人数',
      any: '指定なし',
      guestCount: (n) => `${n}名`,
      guestsPlusCount: (n) => `${n}名以上`,
      upToGuests: (n) => `最大${n}名`,
      maxGuests: (n) => `最大${n}名`,
      perNight: '/ 泊',
      nightCount: (n) => `${n}泊`,
      roomNumber: (num) => `客室 ${num}`,
      roomTypes: {
        ALL: 'すべての客室タイプ',
        Standard: 'スタンダード',
        Deluxe: 'デラックス',
        'Whole House': '一棟貸切（ホールハウス）',
      },
      bookingStatuses: {
        PENDING: '確認待ち',
        CONFIRMED: '予約確定',
        CHECKED_IN: 'チェックイン済',
        CHECKED_OUT: 'チェックアウト済',
        CANCELLED: 'キャンセル',
      },
      paymentStatuses: {
        UNPAID: '未払い',
        PARTIAL: '一部入金済',
        PAID: '支払済',
        REFUNDED: '返金済',
      },
      reviewRatings: {
        1: '改善が必要',
        2: '普通',
        3: '良い滞在',
        4: 'とても良い滞在',
        5: '最高の癒やしの滞在',
      },
      ratingOutOfFive: (n) => `5つ星のうち${n}つ星`,
    },
    datePicker: {
      checkIn: 'チェックイン',
      checkOut: 'チェックアウト',
      addDate: '日付を選択',
      selectCheckIn: 'チェックイン日を選択してください',
      selectCheckOut: 'チェックアウト日を選択してください',
      nightsSelected: (n) => `${n}泊を選択中`,
      bookedUnavailable: '予約済 / 利用不可',
      clearDates: '日付をクリア',
      done: '完了',
      cannotCrossBooked: (d) =>
        `予約済の日程をまたぐことはできないため、${d}をチェックイン日に設定しました。`,
    },
    extraGuests: {
      additionalPersonsOptional: '追加人数（任意）',
      adult: '大人',
      child: 'お子様',
    },
    home: {
      checkAvailability: '空室を検索',
      theSanctuary: 'ザ・サンクチュアリ',
      allPictures: 'すべての写真',
      includedWithEveryStay: 'すべてのご滞在に含まれる特典',
      viewAllRooms: 'すべての客室を見る',
      reserveArrow: '予約へ進む →',
      roomsPreparedSoon: '現在客室情報を準備中です。しばらくしてから再度ご確認ください。',
      guestExperiences: 'ゲストの声',
      wordsFromGuests: 'ご宿泊のお客様からのメッセージ',
      reviewCount: (n) => `${n}件の口コミ`,
      reviewsFallbackSubtitle:
        'カモテス島で穏やかなひとときを過ごされたお客様からのご感想です。',
      viewAllReviews: '口コミをすべて見る',
      reviewYourStay: '口コミを投稿する',
      verified: '宿泊確認済',
      stayedRecentlyTitle: "最近 Jenny's White Haven にご宿泊されましたか？",
      stayedRecentlyDesc:
        'これから訪れるお客様のために、お部屋や島でのご滞在の感想をぜひお聞かせください。',
      bookARoom: '客室を予約する',
      checkStatus: '予約確認',
      sanctuaryPhotosSoon:
        'サンクチュアリのハイライト写真はまもなく公開されます。',
      prevHeroSlide: '前のスライドへ',
      nextHeroSlide: '次のスライドへ',
      playSlideshow: 'スライドショーを再生',
      pauseSlideshow: 'スライドショーを一時停止',
      heroSlidesLabel: 'ヒーロースライド一覧',
      goToSlide: (n) => `スライド${n}へ移動`,
    },
    roomsPage: {
      eyebrow: 'ご宿泊・客室',
      defaultTitle: '海辺の静かなサンクチュアリ',
      defaultSubtitle:
        'ご希望の日程と客室タイプを選択して、最新の空室状況をご確認ください。',
      roomType: '客室タイプ',
      search: '検索',
      clear: 'クリア',
      emptyMessage:
        'ご希望の日程・条件に合う空室が見つかりませんでした。条件を変更して再度お試しください。',
      viewAndReserve: '詳細・予約へ →',
    },
    roomDetail: {
      notFoundTitle: '客室が見つかりません',
      notFoundDesc: 'この客室は現在ご利用いただけません。',
      backToRooms: '客室一覧へ戻る',
      allRooms: '客室一覧',
      roomAmenities: '客室アメニティ・設備',
      selectBothDatesError: 'チェックイン日とチェックアウト日の両方を選択してください。',
      reservationReceived: 'ご予約リクエストを受け付けました',
      saveReferenceHint:
        'いつでも予約状況を確認できるよう、以下の予約番号をお控えください。',
      bookingReference: '予約番号',
      duration: 'ご宿泊日数',
      stayDatesLabel: 'ご宿泊日程',
      totalStay: '合計料金（目安）',
      billedAsPhp: (peso) => `ご請求額: ${peso} PHP`,
      paymentInstructions: 'お支払い方法のご案内',
      trackBookingStatus: '予約状況を確認する',
      includedGuests: (cap) => `基本料金に含まれる人数（最大${cap}名）`,
      firstName: '名（First Name） *',
      lastName: '姓（Last Name） *',
      mobilePhone: '携帯電話番号 *',
      emailOptional: 'メールアドレス（任意）',
      specialRequests: '特別なご要望',
      specialRequestsPlaceholder: '港からの送迎希望、アーリーチェックインなど',
      extraAdultsSummary: (n) => `+大人追加 ${n}名`,
      extraChildrenSummary: (n) => `+お子様追加 ${n}名`,
      approxCurrencyNote: (currency, peso) =>
        `${currency}での概算表示（元料金 ${peso} PHP）・実際のご請求はPHPとなります。`,
      submittingRequest: '送信中...',
      requestReservation: '予約をリクエストする',
    },
    bookingLookup: {
      eyebrow: '予約照会',
      title: '予約状況の確認',
      subtitle:
        'ご予約時の予約番号と、ご登録いただいた電話番号またはメールアドレスを入力してください。',
      bookingReference: '予約番号',
      phoneOrEmail: '電話番号またはメールアドレス',
      phoneOrEmailPlaceholder: '+81 90 XXXX XXXX または guest@email.com',
      searching: '検索中...',
      findReservation: '予約を検索',
      notFoundMessage:
        '一致するご予約が見つかりませんでした。予約番号と連絡先をご確認ください。',
      reference: '予約番号',
      guest: 'ご宿泊者名',
      room: '客室',
      checkIn: 'チェックイン',
      checkOut: 'チェックアウト',
      totalAmount: '合計金額',
      amountPaid: 'お支払い済金額',
      remainingBalance: '残액（お支払い予定額）',
      officialBillingNote: (currency, peso) =>
        `${currency}での概算表示 · 正式なご請求合計: ${peso} PHP`,
      paymentInstructions: 'お支払い方法のご案内',
      thankYouReview: 'ご滞在の口コミをご投稿いただきありがとうございます！',
      yourStayReview: '投稿済みの口コミ',
      published: '公開中',
      archived: '非公開',
      pendingApproval: '承認待ち',
      reviewReceivedNote:
        '口コミを受け付けました。スタッフによる確認後、宿泊者の口コミページに掲載されます。',
      verifiedGuestReview: 'ご宿泊者限定レビュー',
      howWasYourStay: "Jenny's White Haven でのご滞在はいかがでしたか？",
      reviewingAs: (guest, room, ref) =>
        `${guest}様 · ${room}（${ref}）のご感想`,
      yourRating: '評価（星を選択） *',
      rateStarAria: (n) => `5段階中${n}つ星を選択`,
      fromOptional: 'お住まいの地域（任意）',
      fromPlaceholder: '例：東京都',
      headlineOptional: 'タイトル（任意）',
      headlinePlaceholder: 'サンティアゴ・ベイの穏やかな朝',
      yourReview: '口コミ本文 *',
      yourReviewPlaceholder:
        'お部屋の快適さや島の雰囲気、スタッフの対応など、ご感想をお聞かせください...',
      submittingReview: '送信中...',
      submitVerifiedReview: '口コミを投稿する',
      postStayEligibilityNote:
        'ご滞在が完了（チェックアウト済）し、お支払いが完了（支払済）すると、このページからご宿泊口コミを投稿いただけます。',
    },
    explore: {
      eyebrow: 'アイランドガイド · セブ州カモテス島',
      unavailableTitle: 'カモテス島ガイドは現在準備中です',
      unavailableDesc:
        '現在おすすめスポット情報を更新しております。客室一覧をご覧いただくか、チャットにてお気軽にお問い合わせください。',
      returnToSanctuary: 'トップページへ戻る',
      allSpots: (n) => `すべてのスポット (${n})`,
      photoCount: (n) => `写真 ${n}枚`,
      distance: '移動時間・距離',
      bestTime: 'おすすめの時間帯',
      feeAccess: '入場料・アクセス',
      guestTip: '旅のヒント',
      stayAtJwh: "Jenny's White Haven に泊まる",
      returnToQuiet: '島めぐりの後は、海辺の静かな隠れ家でひと休みを。',
      bookDirectDesc:
        '公式サイトから直接ご予約いただくと、現地スタッフがカモテス島での観光プラン作りをお手伝いいたします。',
    },
    gallery: {
      eyebrow: 'ギャラリー',
      unavailableTitle: 'フォトギャラリーは現在準備中です',
      unavailableDesc:
        '現在リゾートの写真を更新しております。ぜひ客室ページをご覧ください。',
      picturesHeading: '写真一覧',
      photoCount: (n) => `${n}枚の写真`,
      exploreAllPictures: 'すべての写真を拡大表示',
      browseRooms: '客室を見る',
      curatingTitle: 'ギャラリー写真を準備中です',
      curatingDesc:
        '現在リゾートの写真を更新しております。ぜひ客室一覧をご覧ください。',
    },
    reviewsPage: {
      eyebrow: 'ゲストの声',
      title: 'ご宿泊のお客様からの口コミ',
      subtitle:
        'カモテス島でのご滞在を完了されたお客様からのリアルなご感想です。不正投稿防止のため、チェックアウトおよびお支払いが完了したご予約のみ口コミを投稿いただけます。',
      verifiedPrompt:
        '最近ご宿泊されましたか？完了したご予約を照会して口コミを投稿できます。',
      reviewYourStay: '口コミを投稿する',
      noReviewsYet: 'まだ公開されている口コミはありません',
      basedOnReviews: (n, verified) =>
        `${verified ? '宿泊確認済' : '公開中'}の口コミ ${n}件に基づく評価`,
      showingStarReviews: (stars) => `星${stars}つの口コミを表示中`,
      showAllReviews: 'すべての口コミを表示',
      verifiedStay: '宿泊確認済',
      hostResponse: "Jenny's White Haven からの返信",
      emptyTitle: 'お客様からの口コミは順次掲載されます',
      emptyStarTitle: (stars) => `星${stars}つの口コミはまだありません`,
      allFilter: (n) => `すべて (${n})`,
      emptyStarDesc:
        '星フィルターを解除すると、公開されているすべての口コミをご覧いただけます。',
      emptyDesc:
        'ご宿泊はお済みですか？予約確認ページで予約番号を入力して、ご感想をお聞かせください。',
      stayedInRoom: (room) => `${room} に宿泊`,
    },
    contactPage: {
      eyebrow: 'お問い合わせ・アクセス',
      defaultTitle: 'カモテス島へのご旅行をサポートいたします。',
      defaultSubtitle:
        'フェリーの時刻表や客室のご希望、一棟貸切のご相談など、いつでもお気軽にお問い合わせください。',
      address: '所在地',
      viewOnMap: '地図を見る ↓',
      phoneMobile: '電話 / 携帯',
      frontDeskNote: 'フロントデスク・港送迎サポート',
      email: 'メール',
      emailNote: 'ご宿泊に関するお問い合わせに迅速にお応えします',
      stayHours: 'チェックイン・アウト時間',
      googleMap: 'Google マップ',
      findUsTitle: 'カモテス島でのアクセス',
      openInGoogleMaps: 'Google マップで開く',
      portFerryTitle: '港・フェリー到着時のご案内',
      ferryDetailNote:
        'ダナオ港（Jomalia Shipping）またはセブ第1埠頭（OceanJet）からお越しですか？ご予約時にフェリーの到着時刻をお知らせいただければ、コンスエロ港・ポロ港からの送迎手配をお手伝いいたします。',
      reservationPaymentTitle: 'ご予約・お支払いについて',
      browseRooms: '客室を見る',
    },
    chat: {
      onlineStatus: 'オンライン · 数分以内に返信いたします',
      awayStatus: '離席中 · メッセージを残していただければ折り返しご連絡します',
      newBtn: '新規',
      connecting: 'フロントデスクに接続中...',
      onlineIntro:
        '空室状況、一棟貸切プラン、フェリー港からの送迎など、お気軽にお尋ねください。',
      awayIntro:
        '現在スタッフがデスクを離れております。ご質問と連絡先を残していただければ、すぐにスタッフへ通知され、チャットとメールでご返信いたします。',
      quickQuestions: 'よくあるご質問',
      quickTopics: [
        '希望の日程に空室はありますか？',
        '一棟貸切の料金と定員について',
        'コンスエロ港 / ポロ港からの送迎',
        'チェックイン・チェックアウト時間',
      ],
      yourName: 'お名前 *',
      email: 'メールアドレス',
      phoneViber: '電話番号',
      followUpHint:
        'ページを離れた際にも返信を受け取れるよう、メールまたは電話番号をご入力ください。',
      message: 'メッセージ *',
      messagePlaceholder: 'こんにちは！2泊での宿泊を検討しています...',
      back: '戻る',
      sending: '送信中...',
      startLiveChat: 'チャットを開始',
      sendInquiry: 'お問い合わせを送信',
      offlineSavedBanner:
        'スタッフへアプリとメールで通知しました。追記も可能です。ページを閉じてもメールで返信をお届けします。',
      you: 'あなた',
      resolvedNotice:
        'このお問い合わせは解決済みになりました。下の欄からメッセージを送信するといつでも再開できます。',
      writeMessagePlaceholder: 'メッセージを入力...',
      close: '閉じる',
      chatWithUs: 'チャット相談',
      openChatAria: 'チャットサポートを開く',
      closeChatAria: 'チャットサポートを閉じる',
      sendMessageAria: 'メッセージを送信',
    },
    cookies: {
      bannerBody:
        "Jenny's White Haven では、安全な予約セッションの維持、ご希望条件の保存、サイト改善のためにCookieおよびブラウザストレージを使用しています。「同意する」をクリックするか「Cookie設定」から選択することで、フィリピンデータプライバシー法（RA 10173）に基づくプライバシー方針に同意したものとみなされます。",
      cookiePreferences: 'Cookie設定',
      agree: '同意する',
      privacyCenterTitle: 'プライバシー設定センター',
      closePrivacyCenterAria: 'プライバシー設定センターを閉じる',
      readPrivacyNotice: 'プライバシーとCookieに関する案内を読む',
      hidePrivacyNotice: 'プライバシーとCookieに関する案内を閉じる',
      manageConsentPreferences: '同意設定の管理',
      alwaysActive: '常に有効',
      essentialOnly: '必須のみ許可',
      allowAll: 'すべて許可',
      confirmChoices: '設定を保存する',
      toggleCategoryAria: (title) => `${title}を切り替え`,
      categories: {
        necessary: {
          title: '必須Cookie',
          description:
            '空室検索、予約フォームのセキュリティ、お支払い証明のアップロード、同意設定の保持など、サイトの基本機能に不可欠であり無効にすることはできません。',
        },
        functional: {
          title: '機能性Cookie',
          description:
            'チェックイン・チェックアウト日、人数、表示通貨や言語設定などを記憶し、よりスムーズなご予約体験を提供します。',
        },
        performance: {
          title: 'パフォーマンスCookie',
          description:
            '匿名化された統計情報を通じて客室や観光ガイドの閲覧状況を把握し、ページの表示速度や使いやすさの向上に役立てます。',
        },
        targeting: {
          title: 'ターゲティングCookie',
          description:
            'キャンペーンの効果測定やSNSでの最新情報のご案内などに使用されます。無効にするとターゲティング広告は配信されません。',
        },
      },
    },
    validation: {
      required: (field) => `${field}を入力してください。`,
      nameNoNumbers: (field) => `${field}に数字は入力できません。`,
      nameInvalidChars: (field) =>
        `${field}には文字・スペース・ハイフン（-）・アポストロフィ（'）のみ使用できます。`,
      nameLength: (field, min, max) =>
        `${field}は${min}〜${max}文字で入力してください。`,
      invalidEmail:
        '正しいメールアドレスを入力してください（例：name@example.com）。',
      phoneRequired: '電話番号を入力してください。',
      phoneInvalidLength: (countryName, dialCode, min, max) =>
        min === max
          ? `${countryName}（${dialCode}）の電話番号を${min}桁で入力してください。`
          : `${countryName}（${dialCode}）の電話番号を${min}〜${max}桁で入力してください。`,
      phoneIntlInvalidLength:
        '国番号を含め7〜15桁の正しい国際電話番号を入力してください。',
      maxLengthExceeded: (field, max) =>
        `${field}は${max}文字以内で入力してください。`,
      minLengthRequired: (field, min) =>
        `${field}は${min}文字以上で入力してください。`,
      invalidBookingReference:
        '予約番号は JWH-20261128-XXXX の形式（英数字・ハイフン）で入力してください。',
      invalidLookupContact:
        'ご予約時に登録したメールアドレスまたは電話番号を入力してください。',
      invalidNationality:
        '国籍は数字や記号を含めず2〜60文字で入力してください。',
      idTypeRequiredForNumber: '身分証明書の種類を選択してください。',
      invalidIdNumber:
        '身分証明書番号は2〜40文字の英数字・スペース・ハイフン・スラッシュで入力してください。',
      invalidLocation:
        '地域名は記号を含めず2〜80文字で入力してください。',
      followUpContactRequired:
        'ご返信のため、メールアドレスまたは電話番号のいずれかをご入力ください。',
      firstNameLabel: '名',
      lastNameLabel: '姓',
      fullNameLabel: 'お名前',
      emailLabel: 'メールアドレス',
      specialRequestsLabel: '特別なご要望',
      messageLabel: 'メッセージ',
      fromLabel: 'お住まいの地域',
      headlineLabel: 'タイトル',
      reviewCommentLabel: '口コミ本文',
    },
  },
}
