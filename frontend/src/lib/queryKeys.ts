export const queryKeys = {
  reports: {
    all: ['reports'] as const,
    detail: (id: number) => ['reports', id] as const,
  },
  complaints: {
    all: ['complaints'] as const,
    detail: (id: number) => ['complaints', id] as const,
  },
  complaintInvestigations: {
    detail: (id: number) => ['complaint-investigations', id] as const,
    history: (id: number) => ['complaint-investigations', id, 'history'] as const,
  },
  restaurants: {
    all: ['restaurants'] as const,
    detail: (id: number) => ['restaurants', id] as const,
  },
  aiAnalysis: {
    detail: (reportId: number) => ['ai-analysis', reportId] as const,
  },
  analytics: {
    summary: ['analytics', 'summary'] as const,
  },
  escalations: {
    all: ['escalations'] as const,
    detail: (id: number) => ['escalations', id] as const,
  },
  reviewerActivity: {
    all: ['reviewer-activity'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
  feedback: {
    all:    ['feedback'] as const,
    detail: (id: number) => ['feedback', id] as const,
    restaurantRating: (restaurantId: number) => ['restaurant-rating', restaurantId] as const,
  },
  auth: {
    profile: ['auth', 'profile'] as const,
  },
}
