export async function fetchThreads() {
  try {
    // MOCK DATA (from your BINI_EVENTS)
    return [
      {
        id: 1,
        title: 'Cloudstaff "ROAR" Year-end Party 2025',
        date: 'December 6, 2025',
        venue: 'Philippine Arena',
        author: 'Admin',
        commentCount: 0,
        isPinned: true
      },
      {
        id: 2,
        title: 'BINI Cosmetics Livestream',
        date: 'December 10, 2025',
        venue: 'BINI.Global Livestream',
        author: 'Admin',
        commentCount: 0,
        isPinned: true
      },
      {
        id: 3,
        title: 'Enervon Z+ X BINI',
        date: 'December 11, 2025',
        venue: 'Livestream',
        author: 'Admin',
        commentCount: 0,
        isPinned: false
      },
      {
        id: 4,
        title: 'Wish Bus 107.5 Guesting',
        date: 'December 15, 2025',
        venue: 'WISH Bus 107.5',
        author: 'Admin',
        commentCount: 0,
        isPinned: false
      },
      {
        id: 5,
        title: 'The Sterling X BINI Fan Meet',
        date: 'December 16, 2025',
        venue: 'New Performing Arts Theater',
        author: 'Admin',
        commentCount: 0,
        isPinned: false
      },
      {
        id: 6,
        title: 'Coachella Music Festival',
        date: 'April 10, 2026',
        venue: 'Indio, California',
        author: 'Admin',
        commentCount: 0,
        isPinned: false
      },
      {
        id: 7,
        title: 'Coachella Music Festival',
        date: 'April 17, 2026',
        venue: 'Indio, California',
        author: 'Admin',
        commentCount: 0,
        isPinned: false
      }
    ];

  } catch (error) {
    console.error('Failed to fetch threads:', error);
    throw error;
  }
}
