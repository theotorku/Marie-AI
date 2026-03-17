function getErrorMessage(err) {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Unknown error";
}

export function sendJsonError(res, status, err) {
  return res.status(status).json({ error: getErrorMessage(err) });
}

function renderOAuthSuccessPage(title, message) {
  return `
    <html><body style="background:#1A1611;color:#E8E0D4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
      <div style="text-align:center">
        <h2 style="color:#C4973B">${title}</h2>
        <p>${message}</p>
        <script>window.close();</script>
      </div>
    </body></html>
  `;
}

export function registerOAuthConnectRoutes(app, options) {
  const {
    provider,
    authPath,
    callbackPath,
    authMiddlewares = [],
    createOAuthState,
    createOAuthStateCookie,
    clearOAuthStateCookie,
    consumeOAuthState,
    getAuthUrl,
    handleCallback,
    successTitle,
    successMessage,
    failureMessage,
  } = options;

  app.get(authPath, ...authMiddlewares, (req, res) => {
    try {
      const state = createOAuthState(provider, req.user.id);
      const url = getAuthUrl(state);
      res.setHeader("Set-Cookie", createOAuthStateCookie(provider, state));
      res.json({ url });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  app.get(callbackPath, async (req, res) => {
    const { code, state } = req.query;
    if (typeof code !== "string" || !code || typeof state !== "string" || !state) {
      res.setHeader("Set-Cookie", clearOAuthStateCookie(provider));
      return res.status(400).send("Missing code or state parameter.");
    }

    const validatedState = consumeOAuthState(provider, req, state);
    if (!validatedState.ok) {
      res.setHeader("Set-Cookie", clearOAuthStateCookie(provider));
      return res.status(400).send(validatedState.error);
    }

    try {
      await handleCallback(code, validatedState.userId);
      res.setHeader("Set-Cookie", clearOAuthStateCookie(provider));
      res.send(renderOAuthSuccessPage(successTitle, successMessage));
    } catch (err) {
      res.setHeader("Set-Cookie", clearOAuthStateCookie(provider));
      res.status(500).send(`${failureMessage}: ${getErrorMessage(err)}`);
    }
  });
}