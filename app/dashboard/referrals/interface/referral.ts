export interface Referral {
  couponId?: string | null;
  docId?: string;
  referee?: string;
  refereeCouponId?: string | null;
  referralTime?: Date;
  referrer?: string;
  signupTime?: Date;
  status?: string;
  validTime?: Date;
}
