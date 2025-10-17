import { NextFunction, Request, Response } from "express";
import { ISSUER_NAME } from "../consts";
import { getOobi } from "../utils/utils";
import { SignifyClient } from "signify-ts";

export async function keriOobiApi(
  _: Request,
  res: Response,
  next: NextFunction
) {
  const client: SignifyClient = _.app.get("signifyClient");

  if (!client) {
    return res.status(503).json({
      error: "KERI client not initialized. Please try again in a moment.",
    });
  }

  try {
    const url = `${await getOobi(
      client,
      ISSUER_NAME
    )}?name=Principia Trust Issuer`;
    res.status(200).send({
      success: true,
      data: url,
    });
  } catch (error) {
    res.status(500).json({
      error: `Failed to get KERI OOBI: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
