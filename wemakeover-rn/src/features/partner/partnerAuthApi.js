/**
 * Partner auth API boundary.
 * Keep all partner network calls here — never reuse customer authApi.
 * Wired to real endpoints in a later phase.
 */

export async function partnerLoginApi({ contact, password }) {
  // Placeholder until partner backend ships.
  await delay(450);
  if (!contact || !password) {
    return { ok: false, message: "Contact and password are required" };
  }
  return {
    ok: true,
    partner: {
      id: `partner-local-${Date.now()}`,
      name: "Partner",
      contact,
    },
  };
}

export async function partnerRegisterApi({
  firstName,
  lastName,
  contact,
  password,
}) {
  await delay(450);
  if (!firstName || !lastName || !contact || !password) {
    return { ok: false, message: "Please fill all required fields" };
  }
  return {
    ok: true,
    partner: {
      id: `partner-local-${Date.now()}`,
      name: `${firstName} ${lastName}`.trim(),
      contact,
    },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
