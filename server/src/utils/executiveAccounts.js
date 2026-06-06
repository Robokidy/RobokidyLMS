const EXECUTIVE_ACCOUNTS = {
  cto: {
    envPrefix: "CTO",
    fullName: "Chief Technology Officer"
  },
  cmo: {
    envPrefix: "CMO",
    fullName: "Chief Marketing Officer"
  }
};

function getExecutiveAccountConfig(role) {
  const account = EXECUTIVE_ACCOUNTS[role];
  if (!account) throw new Error(`Unknown executive role: ${role}`);

  const username = (process.env[`${account.envPrefix}_USERNAME`] || role).trim().toLowerCase();
  const email = (process.env[`${account.envPrefix}_EMAIL`] || "").trim().toLowerCase();
  const password = process.env[`${account.envPrefix}_PASSWORD`];

  if (!password) return null;

  return {
    username,
    email,
    password,
    role,
    fullName: account.fullName
  };
}

async function ensureExecutiveAccount(User, role, options = {}) {
  const config = getExecutiveAccountConfig(role);
  const actionName = role.toUpperCase();

  if (!config) {
    console.warn(`${actionName}_PASSWORD is not set; skipping ${actionName} account provisioning`);
    return null;
  }

  const identifiers = [{ role }, { username: config.username }];
  if (config.email) identifiers.push({ email: config.email });

  let user = await User.findOne({ $or: identifiers });
  if (!user) {
    user = await User.create({
      username: config.username,
      email: config.email,
      password: config.password,
      role,
      fullName: config.fullName,
      active: true,
      firstLogin: true
    });
    console.log(`${actionName} account created`);
    return user;
  }

  user.username = config.username;
  user.email = config.email;
  user.role = role;
  user.fullName = user.fullName || config.fullName;
  user.active = true;
  if (options.rotatePassword) {
    user.password = config.password;
    user.firstLogin = true;
  }
  await user.save();
  console.log(`${actionName} account updated`);
  return user;
}

module.exports = { ensureExecutiveAccount, getExecutiveAccountConfig };
