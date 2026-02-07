import { sendOk } from './_util'

export default async function handler(_req: any, res: any) {
  return sendOk(res, { ok: true })
}
