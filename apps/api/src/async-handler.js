export function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    try {
      return Promise.resolve(handler.call(this, req, res, next)).catch(next);
    } catch (error) {
      return next(error);
    }
  };
}
