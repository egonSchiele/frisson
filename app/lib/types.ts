export type UpdateData = {
  eventName: string;
  data: any;
};

export type SuccessResult = {
  success: true;
  data?: any;
};

export type FailureResult = {
  success: false;
  message: string;
};

export type Result = SuccessResult | FailureResult;

export type SpeechData = {
  s3key: string;
  userid: string;
  created_at: number;
};
