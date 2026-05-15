export { makeRepo, type Repo } from './_factory';
export { shopRepo, findNearbyShops, type NearbyShop, type NearbyParams } from './shop';
export { serviceRepo, listServicesForShop } from './service';
export { barberRepo, listBarbersForShop } from './barber';
export { seatRepo, listSeatsForShop } from './seat';
export { rosterRepo, getCurrentRoster, checkRosterConflicts, type RosterConflict } from './roster';
export {
  bookingRepo,
  getAvailability,
  createBooking,
  updateBookingStatus,
  listMyBookings,
  type AvailabilitySlot,
  type AvailabilityParams,
  type CreateBookingPayload,
} from './booking';
export {
  walkinTicketRepo,
  joinWalkinQueue,
  cancelWalkinTicket,
  getWalkinSnapshot,
  type JoinWalkinPayload,
  type WalkinSnapshot,
} from './walkinTicket';
export {
  reviewRepo,
  listReviewsForShop,
  submitReview,
  replyToReview,
  type SubmitReviewPayload,
} from './review';
export {
  loyaltyAccountRepo,
  getMyLoyaltyForShop,
  redeemPoints,
  type RedeemPayload,
  type RedeemResult,
} from './loyaltyAccount';
