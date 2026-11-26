export const APP_CONFIG = {
  github: {
    owner: "galaxy-sc",
    repo: "test2",
    branch: "data",
    workflowId: "generate-cert.yml"
  },
  worker: {
    baseUrl: "https://owasp-crt-proxy.betaa-facebook.workers.dev"
  },
  domain: "https://galaxy-sc.github.io/test2",
  assetsPath: "/test2/assets",
};

export const NAME_VERIFY_PUBLIC_KEY_JWK = {
  "key_ops":["verify"],"ext":true,"kty":"EC","x":"xmhL4aYqQwHBdQbUSiPCiT9VvokCNGuU6aMGVh1Uq4o","y":"YV40XyjR2_nZzYq4R2Sz7-LJK48n-3qbl4E6cx0itXk","crv":"P-256"
};