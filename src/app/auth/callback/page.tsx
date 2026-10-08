// The Neon client opens this public route to complete OAuth in iframe previews.
// Its built-in popup handler sends the verifier to the opener and closes the tab.
export { default, metadata } from "../complete/page";
