import Joi from "joi";

export const validateProcessEmailsRequest = (data: any) => {
  const schema = Joi.object({
    maxResults: Joi.number().integer().min(1).max(50).default(5),
  });

  return schema.validate(data);
};

export const validateExtractTasksRequest = (data: any) => {
  const schema = Joi.object({
    email: Joi.object({
      id: Joi.string().required(),
      subject: Joi.string().required(),
      from: Joi.string().required(),
      body: Joi.string().required(),
      threadId: Joi.string().required(),
      receivedAt: Joi.date().required(),
    }).required(),
  });

  return schema.validate(data);
};

