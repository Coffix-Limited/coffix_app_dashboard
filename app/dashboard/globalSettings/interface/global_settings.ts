export interface GlobalSettings {
  GST?: number;
  appVersion?: string;
  basicDiscount?: number;
  discountLevel2?: number;
  discountLevel3?: number;
  maxDayBetweenLogin?: number;
  minCreditToShare?: number;
  minTopUp?: number;
  specialUrl?: string;
  storeUrl?: string;
  tcUrl?: string;
  topupLevel1?: number;
  topupLevel2?: number;
  topupLevel3?: number;
  withdrawalFee?: number;
  creditExpiryDuration?: number;
  referralExpiryDays?: number;
  couponDefaultAmount?: number;
  couponExpiryDays?: number;
  aboutUrl?: string;

  // Default flags that will be query when creating new user
  defScheduleOrder?: boolean;
  defShareCredit?: boolean;
  defWithdrawBalance?: boolean;
  defCoffixCreditAvailable?: boolean;
  defGetPurchaseInfoByMail?: boolean;
  defGetPromotions?: boolean;
  defAllowWinACoffee?: boolean;
  defAllowCoffeeForHome?: boolean;
}
