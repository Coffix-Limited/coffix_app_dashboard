export interface WindcaveLink {
  href?: string;
  rel?: string;
  method?: string;
}

export interface WindcaveCard {
  cardHolderName?: string;
  cardNumber?: string; // masked, e.g. "411111........11"
  dateExpiryMonth?: string;
  dateExpiryYear?: string;
  type?: string; // e.g. "visa"
}

export interface WindcaveAcquirer {
  name?: string;
  mid?: string;
  tid?: string;
  reCo?: string;
  responseText?: string;
}

export interface WindcaveCustomer {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  account?: string;
}

export interface WindcaveTransaction {
  id?: string;
  authorised?: boolean;
  reCo?: string;
  responseText?: string;
  authCode?: string;
  type?: string;
  method?: string;
  amount?: string; // strings in the response, e.g. "4.00"
  balanceAmount?: string;
  amountTotal?: string;
  currency?: string;
  merchantReference?: string;
  dateTimeUtc?: string;
  dateTimeLocal?: string;
  settlementDate?: string;
  clientType?: string;
  sessionId?: string;
  card?: WindcaveCard;
  acquirer?: WindcaveAcquirer;
  customer?: WindcaveCustomer;
  links?: WindcaveLink[];
}

export interface WindcaveSession {
  id?: string;
  state?: string; // e.g. "complete"
  links?: WindcaveLink[];
  transactions?: WindcaveTransaction[];
}
