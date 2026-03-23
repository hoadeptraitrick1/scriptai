export const formatApiError = (err: any): string => {
  const errMsg = err?.message || String(err);
  if (
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("exceeded your current quota")
  ) {
    return "Hết lượt dùng miễn phí API trong giờ/ngày, hãy lưu dự án xuống, đổi mail khác và sử dụng app để tận dụng API key của gmail mới. Hoặc có thể đợi đến ngày mai thử lại";
  }
  return errMsg;
};
