import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Loader2, AlertCircle, FileCode, ChevronDown } from 'lucide-react';
import { apiDesignService } from '../services/apiDesignService';

const buildSwaggerHtml = (specText) => {
  const escaped = specText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>API Spec</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui.css"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { margin: 0; padding: 0; background: #0b0f1e; }
    body { margin: 0; padding: 0 0 32px; background: #0b0f1e; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; }

    /* ── Core ──────────────────────────────────────────── */
    .swagger-ui { background: #0b0f1e; }
    .swagger-ui .wrapper { max-width: 1280px; padding: 0 28px; }
    .swagger-ui .topbar { display: none !important; }

    /* ── Info block ─────────────────────────────────────── */
    .swagger-ui .information-container {
      background: linear-gradient(135deg, #161b2e 0%, #0e1525 100%);
      border-bottom: 1px solid #1e293b;
      padding: 28px 28px 24px !important;
    }
    .swagger-ui .info { margin: 0; }
    .swagger-ui .info hgroup.main { margin-bottom: 10px; }
    .swagger-ui .info .title {
      color: #f8fafc;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.4px;
    }
    .swagger-ui .info .title small {
      background: rgba(249,115,22,0.12);
      color: #f97316;
      border: 1px solid rgba(249,115,22,0.25);
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 10px;
      vertical-align: middle;
      letter-spacing: 0.02em;
    }
    .swagger-ui .info p { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
    .swagger-ui .info a { color: #f97316; text-decoration: none; }
    .swagger-ui .info a:hover { text-decoration: underline; }
    .swagger-ui .info .base-url { color: #475569; font-size: 12px; margin-top: 6px; }
    .swagger-ui .info code { background: #0f172a; color: #94a3b8; padding: 1px 5px; border-radius: 4px; font-size: 11px; }

    /* ── Scheme/auth bar ────────────────────────────────── */
    .swagger-ui .scheme-container {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 10px 20px;
      box-shadow: none;
    }
    .swagger-ui .schemes > label {
      color: #475569; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .swagger-ui select {
      background: #161b2e; color: #e2e8f0;
      border: 1px solid #2d3748; border-radius: 7px;
      padding: 6px 28px 6px 10px; font-size: 12px;
      outline: none; cursor: pointer;
      -webkit-appearance: none; appearance: none;
      transition: border-color 0.2s;
    }
    .swagger-ui select:focus { border-color: #f97316; }
    .swagger-ui select option { background: #161b2e; }

    /* Authorize button */
    .swagger-ui .auth-wrapper .authorize {
      background: transparent;
      border: 1px solid #2d3748;
      color: #94a3b8;
      border-radius: 7px;
      padding: 6px 14px;
      font-size: 12px; font-weight: 500;
      transition: all 0.15s; cursor: pointer;
    }
    .swagger-ui .auth-wrapper .authorize:hover {
      border-color: #10b981; color: #10b981;
      background: rgba(16,185,129,0.06);
    }
    .swagger-ui .auth-wrapper .authorize svg { fill: currentColor; }

    /* Filter */
    .swagger-ui .filter .operation-filter-input {
      background: #161b2e; color: #e2e8f0;
      border: 1px solid #1e293b; border-radius: 8px;
      padding: 8px 14px; font-size: 13px;
      outline: none; width: 100%; transition: border-color 0.2s;
    }
    .swagger-ui .filter .operation-filter-input:focus { border-color: #f97316; }

    /* ── Tag headers ────────────────────────────────────── */
    .swagger-ui .opblock-tag {
      border-bottom: 1px solid #1e293b;
      padding: 14px 0 10px;
      color: #f1f5f9;
    }
    .swagger-ui .opblock-tag:hover { background: rgba(255,255,255,0.01); }
    .swagger-ui .opblock-tag h4 {
      font-size: 16px; font-weight: 600; color: #f1f5f9; margin: 0;
    }
    .swagger-ui .opblock-tag small { color: #64748b; font-size: 13px; }
    .swagger-ui .expand-methods svg { fill: #475569; }
    .swagger-ui .arrow { fill: #475569 !important; }
    .swagger-ui svg.arrow { fill: #475569 !important; }

    /* ── Operation blocks ───────────────────────────────── */
    .swagger-ui .opblock {
      border-radius: 10px;
      margin-bottom: 8px;
      border: 1px solid #1a2035;
      background: #0c1120;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      overflow: hidden;
      transition: box-shadow 0.2s, transform 0.1s;
    }
    .swagger-ui .opblock:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .swagger-ui .opblock.is-open {
      box-shadow: 0 6px 24px rgba(0,0,0,0.5);
    }

    /* Method accent colors */
    .swagger-ui .opblock.opblock-get    { border-left: 3px solid #3b82f6; }
    .swagger-ui .opblock.opblock-post   { border-left: 3px solid #10b981; }
    .swagger-ui .opblock.opblock-put    { border-left: 3px solid #f59e0b; }
    .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444; }
    .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #8b5cf6; }
    .swagger-ui .opblock.opblock-head   { border-left: 3px solid #06b6d4; }
    .swagger-ui .opblock.opblock-options{ border-left: 3px solid #6366f1; }

    .swagger-ui .opblock.opblock-get    .opblock-summary { background: rgba(59,130,246,0.05); }
    .swagger-ui .opblock.opblock-post   .opblock-summary { background: rgba(16,185,129,0.05); }
    .swagger-ui .opblock.opblock-put    .opblock-summary { background: rgba(245,158,11,0.05); }
    .swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(239,68,68,0.05); }
    .swagger-ui .opblock.opblock-patch  .opblock-summary { background: rgba(139,92,246,0.05); }
    .swagger-ui .opblock.opblock-head   .opblock-summary { background: rgba(6,182,212,0.05); }
    .swagger-ui .opblock.opblock-options .opblock-summary { background: rgba(99,102,241,0.05); }

    .swagger-ui .opblock .opblock-summary {
      border: none !important;
      padding: 12px 16px;
      cursor: pointer;
      align-items: center;
      transition: filter 0.15s;
    }
    .swagger-ui .opblock .opblock-summary:hover { filter: brightness(1.12); }
    .swagger-ui .opblock .opblock-summary-control { display: flex; align-items: center; gap: 10px; }

    /* Method badge */
    .swagger-ui .opblock-summary-method {
      border-radius: 6px;
      min-width: 74px;
      font-weight: 700;
      font-size: 11px;
      padding: 5px 8px;
      text-align: center;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .swagger-ui .opblock .opblock-summary-path {
      color: #e2e8f0; font-weight: 600; font-size: 14px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .swagger-ui .opblock .opblock-summary-description { color: #64748b; font-size: 13px; }
    .swagger-ui .opblock .opblock-summary-operation-id { color: #475569; font-size: 12px; }
    .swagger-ui .opblock-deprecated .opblock-summary-path { opacity: 0.5; text-decoration: line-through; }

    /* ── EXPANDED BODY ──────────────────────────────────── */
    .swagger-ui .opblock-body { background: #0b0f1e; }

    /* Section headers */
    .swagger-ui .opblock-section-header {
      background: #0e1525;
      border-top: 1px solid #1a2438;
      padding: 10px 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .swagger-ui .opblock-section-header h4 {
      color: #64748b; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em; margin: 0;
    }
    .swagger-ui .opblock-section-header label { color: #475569; font-size: 12px; }

    .swagger-ui .opblock-description-wrapper { padding: 12px 16px; }
    .swagger-ui .opblock-description-wrapper p { color: #94a3b8; font-size: 13px; margin: 0; }

    /* Try it out / Cancel */
    .swagger-ui .try-out__btn {
      background: transparent;
      border: 1px solid #2d3748; color: #64748b;
      border-radius: 6px; font-size: 12px; font-weight: 500;
      padding: 5px 12px; cursor: pointer;
      transition: all 0.15s;
    }
    .swagger-ui .try-out__btn:hover {
      border-color: #f97316; color: #f97316;
      background: rgba(249,115,22,0.06);
    }
    .swagger-ui .try-out__btn.cancel { border-color: #ef4444; color: #ef4444; }

    /* ── Parameters table ───────────────────────────────── */
    .swagger-ui .parameters-container { padding: 0 16px 16px; background: #0b0f1e; }
    .swagger-ui .parameter-item { background: transparent; }
    .swagger-ui table.parameters { width: 100%; border-collapse: separate; border-spacing: 0; }
    .swagger-ui table thead tr th,
    .swagger-ui table thead tr td {
      background: #0d1526; border-bottom: 1px solid #1a2438;
      color: #334155; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      padding: 8px 12px;
    }
    .swagger-ui table tbody tr td {
      border-bottom: 1px solid #0f1929;
      background: transparent; color: #e2e8f0;
      padding: 12px 12px; vertical-align: top;
    }
    .swagger-ui table tbody tr:last-child td { border-bottom: none; }

    /* Parameter name */
    .swagger-ui .parameter__name {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 13px; color: #e2e8f0; font-weight: 600;
    }
    .swagger-ui .parameter__name.required::after { color: #f97316; content: ' *'; font-size: 12px; }
    .swagger-ui .parameter__type {
      font-size: 11px; color: #3b82f6;
      background: rgba(59,130,246,0.08);
      border: 1px solid rgba(59,130,246,0.18);
      border-radius: 4px; padding: 1px 6px;
      display: inline-block; margin-top: 3px;
      font-family: monospace;
    }
    .swagger-ui .parameter__in {
      font-size: 10px; color: #475569; font-style: italic; margin-top: 2px;
    }
    .swagger-ui .parameter__deprecated { color: #334155; }

    /* Form area background (like in the image) */
    .swagger-ui .parameters-container,
    .swagger-ui .opblock-body .opblock-section {
      background: #0b0f1e;
    }

    /* Markdown / descriptions */
    .swagger-ui .markdown p { color: #94a3b8; font-size: 13px; margin: 2px 0; }
    .swagger-ui .markdown code {
      background: #161b2e; color: #f97316;
      padding: 1px 5px; border-radius: 3px; font-size: 11px;
    }

    /* ── Inputs ─────────────────────────────────────────── */
    .swagger-ui input[type=text],
    .swagger-ui input[type=password],
    .swagger-ui input[type=email],
    .swagger-ui input[type=search],
    .swagger-ui input[type=number],
    .swagger-ui input[type=file] {
      background: #111827; color: #e2e8f0;
      border: 1px solid #2d3748; border-radius: 7px;
      padding: 8px 12px; font-size: 13px;
      width: 100%; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .swagger-ui input[type=text]:focus,
    .swagger-ui input[type=password]:focus,
    .swagger-ui input[type=number]:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
    }
    .swagger-ui input::placeholder { color: #334155; }

    .swagger-ui textarea {
      background: #111827; color: #e2e8f0;
      border: 1px solid #2d3748; border-radius: 7px;
      padding: 9px 12px; font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      min-height: 80px; resize: vertical; width: 100%;
      outline: none; transition: border-color 0.2s;
    }
    .swagger-ui textarea:focus { border-color: #f97316; }
    .swagger-ui label { color: #64748b; font-size: 12px; }

    /* ── Buttons ─────────────────────────────────────────── */
    .swagger-ui .btn {
      border-radius: 7px; font-size: 13px; font-weight: 500;
      padding: 7px 16px; transition: all 0.15s; cursor: pointer;
    }
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #f97316 0%, #ea6c0a 100%);
      border: none; color: #fff; font-weight: 600;
      box-shadow: 0 2px 10px rgba(249,115,22,0.3);
    }
    .swagger-ui .btn.execute:hover {
      box-shadow: 0 4px 18px rgba(249,115,22,0.45);
      transform: translateY(-1px);
    }
    .swagger-ui .btn.execute:active { transform: translateY(0); }
    .swagger-ui .btn.btn-clear {
      background: transparent; border: 1px solid #2d3748; color: #64748b;
    }
    .swagger-ui .btn.btn-clear:hover { border-color: #ef4444; color: #ef4444; }
    .swagger-ui .copy-to-clipboard button {
      background: #161b2e; border: 1px solid #2d3748;
      color: #64748b; border-radius: 6px;
    }
    .swagger-ui .copy-to-clipboard button:hover { border-color: #f97316; color: #f97316; }

    /* ── Execute wrapper (the mint-green section in image) ─ */
    .swagger-ui .execute-wrapper {
      padding: 12px 16px;
      background: #0e1525;
      border-top: 1px solid #1a2438;
    }

    /* ── Responses ──────────────────────────────────────── */
    .swagger-ui .responses-wrapper { padding: 0 16px 16px; }
    .swagger-ui .responses-inner { background: transparent; }
    .swagger-ui .responses-inner h4 {
      color: #64748b; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      margin: 0 0 8px;
    }
    .swagger-ui .response-col_status {
      font-family: monospace; font-size: 14px; font-weight: 700;
    }
    .swagger-ui .response-col_description { color: #94a3b8; font-size: 13px; }
    .swagger-ui .response-col_links { color: #475569; }
    .swagger-ui .response-content-type { font-size: 12px; color: #475569; }

    /* Status code chip colors */
    .swagger-ui table.responses-table .response-col_status { padding: 10px 12px; }

    /* ── Code blocks ─────────────────────────────────────── */
    .swagger-ui .highlight-code {
      background: #161b2e;
      border-radius: 8px;
      border: 1px solid #1e293b;
      overflow: hidden;
    }
    .swagger-ui pre.microlight {
      background: #161b2e !important;
      color: #e2e8f0 !important;
      border-radius: 8px;
      padding: 14px 16px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 12px; line-height: 1.65;
      overflow-x: auto; margin: 0;
    }
    /* Microlight string values */
    .swagger-ui pre.microlight span[style*="color: rgb(136, 174"]  { color: #10b981 !important; }
    .swagger-ui pre.microlight span[style*="color: rgb(0, 0, 255"]  { color: #3b82f6 !important; }
    .swagger-ui pre.microlight span[style*="color: rgb(0, 128, 0"]  { color: #10b981 !important; }

    .swagger-ui .curl-command {
      background: #0f172a; border: 1px solid #1e293b; border-radius: 8px;
      padding: 12px 14px; color: #94a3b8;
      font-family: monospace; font-size: 12px; word-break: break-all;
    }
    .swagger-ui .request-url { color: #f97316; margin-top: 8px; }
    .swagger-ui .request-url pre { color: #f97316; }

    /* Response content section (like the dark code area in image) */
    .swagger-ui .response-body pre {
      background: #161b2e;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 14px 16px;
      color: #e2e8f0;
      font-size: 12px;
    }

    /* ── Models ─────────────────────────────────────────── */
    .swagger-ui section.models {
      background: #0e1525;
      border: 1px solid #1e293b; border-radius: 10px;
      margin: 20px 20px 28px;
    }
    .swagger-ui section.models h4 {
      color: #f1f5f9; font-size: 15px; font-weight: 600;
      padding: 14px 18px; margin: 0;
      border-bottom: 1px solid transparent;
    }
    .swagger-ui section.models.is-open h4 { border-bottom-color: #1e293b; }
    .swagger-ui section.models h4 svg { fill: #475569; }
    .swagger-ui section.models .model-container {
      background: #0b0f1e;
      border-top: 1px solid #1e293b;
      padding: 14px 18px; margin: 0;
    }
    .swagger-ui .model-title { color: #f97316; font-size: 14px; font-weight: 600; }
    .swagger-ui .model { color: #e2e8f0; font-family: monospace; font-size: 13px; }
    .swagger-ui .model-box { background: #161b2e; border-radius: 6px; padding: 8px 12px; }
    .swagger-ui .model .property.primitive { color: #10b981; }
    .swagger-ui .prop-name { color: #e2e8f0; }
    .swagger-ui .prop-type { color: #3b82f6; font-style: italic; }
    .swagger-ui .prop-format { color: #475569; }
    .swagger-ui .prop-enum { color: #f59e0b; }
    .swagger-ui .model-toggle { color: #475569; }
    .swagger-ui .model-toggle:after { background: #334155; }

    /* ── Auth modal ─────────────────────────────────────── */
    .swagger-ui .dialog-ux .backdrop-ux {
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
    }
    .swagger-ui .dialog-ux .modal-ux {
      background: #161b2e;
      border: 1px solid #334155; border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.65);
    }
    .swagger-ui .dialog-ux .modal-ux-header {
      border-bottom: 1px solid #1e293b; padding: 16px 20px;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #f1f5f9; font-size: 17px; }
    .swagger-ui .dialog-ux .modal-ux-content { padding: 16px 20px; }
    .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content label { color: #94a3b8; font-size: 13px; }
    .swagger-ui .close-modal { color: #475569; }
    .swagger-ui .close-modal:hover { color: #ef4444; }

    /* ── Tabs ────────────────────────────────────────────── */
    .swagger-ui .tab {
      border-bottom: 1px solid #1e293b;
      margin-bottom: 12px; display: flex; gap: 0;
    }
    .swagger-ui .tab li {
      color: #475569; font-size: 12px; font-weight: 500;
      padding: 7px 14px; cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color 0.15s;
    }
    .swagger-ui .tab li.active { color: #f97316; border-bottom-color: #f97316; }
    .swagger-ui .tab li:hover:not(.active) { color: #94a3b8; }
    .swagger-ui .tab li button { color: inherit; background: none; border: none; cursor: pointer; }

    /* ── Scrollbar ──────────────────────────────────────── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0b0f1e; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }

    /* ── Links ──────────────────────────────────────────── */
    .swagger-ui a { color: #f97316; }
    .swagger-ui a:hover { color: #fb923c; }

    /* ── Try It Out — expanded parameter form ───────────── */
    /* Subtle tinted background for the whole parameter/body area (like mint in the screenshot) */
    .swagger-ui .opblock.is-open .opblock-body {
      background: #080d19;
    }
    .swagger-ui .opblock.is-open .parameters-container {
      background: rgba(16,185,129,0.03);
      border-bottom: 1px solid #1a2438;
    }
    /* Column header row (Name / Description) */
    .swagger-ui .col.col_header {
      color: #334155; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
    }
    /* Parameter description column */
    .swagger-ui .parameter-col_description input,
    .swagger-ui .parameters .parameter-col_description textarea {
      background: #111827;
      color: #e2e8f0;
      border: 1px solid #2d3748;
      border-radius: 7px;
      padding: 8px 12px;
      font-size: 13px;
      width: 100%;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .swagger-ui .parameter-col_description input:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
    }
    .swagger-ui .parameter-col_description input::placeholder { color: #334155; }
    /* File input */
    .swagger-ui input[type="file"] {
      background: #111827; color: #94a3b8;
      border: 1px solid #2d3748; border-radius: 7px;
      padding: 6px 10px; font-size: 12px;
      cursor: pointer;
    }
    /* "required" badge */
    .swagger-ui .parameter__name .required { color: #ef4444; font-size: 10px; margin-left: 4px; }
    /* Empty value toggle */
    .swagger-ui .parameter__empty_value_toggle { color: #475569; font-size: 11px; }
    .swagger-ui .parameter__empty_value_toggle input { width: auto; }

    /* Execute + Clear row */
    .swagger-ui .execute-wrapper {
      padding: 12px 16px 16px;
      background: rgba(16,185,129,0.03);
      border-top: 1px solid #1a2438;
      display: flex; gap: 8px; align-items: center;
    }
    /* Loading spinner in response */
    .swagger-ui .loading-container { background: transparent; }

    /* ── Live responses area ─────────────────────────────── */
    .swagger-ui .responses-wrapper {
      background: #080d19;
      padding: 0 16px 16px;
    }
    /* "Response content type" row */
    .swagger-ui .responses-inner .response-controls {
      background: rgba(16,185,129,0.03);
      border-bottom: 1px solid #1a2438;
      padding: 8px 12px;
    }
    /* Responses table header (Code / Description) */
    .swagger-ui .responses-table thead td {
      color: #334155; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      background: #0d1526; border-bottom: 1px solid #1a2438;
      padding: 8px 12px;
    }
    /* Status code coloring */
    .swagger-ui .response-col_status .response-undocumented { color: #475569; }
    /* Server response block */
    .swagger-ui .server-response { margin-top: 12px; }
    .swagger-ui .server-response .title { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .swagger-ui .server-response-body {
      background: #161b2e;
      border: 1px solid #1e293b; border-radius: 8px;
      padding: 14px 16px;
      color: #e2e8f0; font-family: monospace; font-size: 12px; line-height: 1.65;
    }
    /* Live response details */
    .swagger-ui .response-body { margin-top: 8px; }
    .swagger-ui .curl-command pre { background: #0f172a; color: #94a3b8; border-radius: 8px; padding: 12px 14px; font-size: 11px; }
    .swagger-ui .request-url pre { color: #f97316; font-size: 12px; }
    /* Response header table */
    .swagger-ui .headers-wrapper > h4 { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin: 12px 0 6px; }
    .swagger-ui .response-col_description__inner div.markdown p { font-size: 13px; }
    /* Example value / Model tab area */
    .swagger-ui .model-example { background: #0b0f1e; }
    .swagger-ui .example { background: #161b2e; border-radius: 8px; padding: 12px 14px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.18.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/js-yaml@4/dist/js-yaml.min.js"></script>
  <script>
    (function() {
      try {
        const raw = \`${escaped}\`;
        let spec;
        try { spec = JSON.parse(raw); }
        catch(_) { spec = jsyaml.load(raw); }
        SwaggerUIBundle({
          spec,
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
          showExtensions: true,
        });
      } catch (err) {
        document.body.innerHTML =
          '<div style="padding:40px;font-family:monospace;font-size:13px;background:#0b0f1e;min-height:100vh;color:#ef4444;">' +
          '<div style="color:#f1f5f9;font-size:16px;font-weight:600;margin-bottom:12px;">Render Error</div>' +
          err.message + '</div>';
      }
    })();
  </script>
</body>
</html>`;
};

export default function ViewSpecModal({ spec, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const blobRef = useRef(null);

  const specId = spec?.id || spec?.specMetadataId;
  const specName = spec?.specName || spec?.name || spec?.fileName || 'API Specification';

  const revokeBlobUrl = useCallback(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  }, []);

  const buildAndSetUrl = useCallback((text) => {
    revokeBlobUrl();
    const html = buildSwaggerHtml(text);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    blobRef.current = url;
    setBlobUrl(url);
    setRefreshKey((k) => k + 1);
  }, [revokeBlobUrl]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const embedded = spec?.content || spec?.specContent || '';
      if (embedded) {
        if (!cancelled) {
          setContent(embedded);
          buildAndSetUrl(embedded);
          setLoading(false);
        }
        return;
      }

      if (!specId) {
        if (!cancelled) {
          setError('No spec ID available to fetch content.');
          setLoading(false);
        }
        return;
      }

      const result = await apiDesignService.getSpecContent(specId);
      if (cancelled) return;

      if (result.success) {
        if (result.content) {
          setContent(result.content);
          buildAndSetUrl(result.content);
        } else {
          setError('The spec appears to be empty.');
        }
      } else {
        setError(result.error || 'Failed to load spec content.');
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
      revokeBlobUrl();
    };
  }, [spec]);

  const handleRefresh = () => {
    if (content) buildAndSetUrl(content);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0b0f1e]">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          background: 'linear-gradient(90deg, #161b2e 0%, #0e1525 100%)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20">
            <FileCode className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate max-w-[420px] leading-tight">{specName}</p>
            {specId && (
              <p className="text-[11px] text-gray-600 font-mono truncate max-w-[320px] leading-tight mt-0.5 hidden sm:block">
                {specId}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!loading && !error && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#0f172a] border border-[#1e293b] hover:border-[#ef4444]/40 hover:text-red-400 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative bg-[#0b0f1e]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f1e] z-10 gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-[#1e293b]" />
              <Loader2 className="w-14 h-14 text-[#f97316] animate-spin absolute inset-0" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium">Loading specification</p>
              <p className="text-gray-600 text-xs mt-1">Fetching API documentation…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f1e] z-10 gap-4 px-8 text-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-gray-100 font-semibold text-lg">Failed to load specification</p>
              <p className="text-sm text-gray-500 max-w-md mt-2 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => { setError(''); setLoading(true); }}
              className="px-4 py-2 text-sm bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/25 rounded-lg hover:bg-[#f97316]/25 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && blobUrl && (
          <iframe
            key={refreshKey}
            src={blobUrl}
            className="w-full h-full border-0"
            title={`Swagger UI — ${specName}`}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
