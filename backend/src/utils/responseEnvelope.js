const createBaseMeta = (meta = {}) => ({
  timestamp: new Date().toISOString(),
  ...meta,
});

export const createSuccessEnvelope = ({
  data = {},
  message = "",
  errors = [],
  meta = {},
} = {}) => ({
  success: true,
  data,
  message,
  errors,
  meta: createBaseMeta(meta),
});

export const createErrorEnvelope = ({
  message = "Something went wrong",
  errors = [],
  meta = {},
} = {}) => ({
  success: false,
  data: {},
  message,
  errors,
  meta: createBaseMeta(meta),
});
