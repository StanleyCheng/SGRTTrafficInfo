import test from "node:test";
import assert from "node:assert/strict";
import {
  isConfigurationError,
  isPublishedERPGap,
  roadDataTime,
} from "../src/lib/data-status.ts";

const data = {
  generatedAt: "2026-09-28T12:00:00Z",
  layers: [
    { id: "incidents", sources: [{ fetchedAt: "2026-09-28T11:58:00Z" }] },
    {
      id: "traffic-speed",
      sources: [
        { fetchedAt: "2026-09-28T11:55:00Z" },
        { fetchedAt: "invalid" },
      ],
    },
    { id: "zones", sources: [{ fetchedAt: "2026-09-22T09:12:00Z" }] },
  ],
};

test("freshness reflects the oldest active observation, not the response or inactive layer", () => {
  assert.equal(
    roadDataTime(data, ["incidents", "traffic-speed"], false),
    "2026-09-28T11:55:00Z",
  );
});

test("a static snapshot retains its capture date", () => {
  assert.equal(roadDataTime(data, ["incidents"], true), data.generatedAt);
});

test("missing observation times fall back to the response date", () => {
  assert.equal(roadDataTime(data, [], false), data.generatedAt);
});

test("configuration failures are distinguished from retryable failures", () => {
  assert.equal(
    isConfigurationError(
      "Traffic Incidents: DATAMALL_ACCOUNT_KEY is not configured",
    ),
    true,
  );
  assert.equal(isConfigurationError("HTTP 503: service unavailable"), false);
  assert.equal(isConfigurationError(null), false);
});

test("the retired ERP rate feed offers its published table, not a retry", () => {
  assert.equal(isPublishedERPGap("LTA ERP Rates (DataMall): HTTP 404"), true);
  assert.equal(isPublishedERPGap("LTA ERP Rates (DataMall): HTTP 503"), false);
  assert.equal(
    isPublishedERPGap("LTA ERP Rates: HTTP 404; Incidents: HTTP 503"),
    false,
  );
});
