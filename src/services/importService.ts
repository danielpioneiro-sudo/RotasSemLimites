import DocumentPicker from 'react-native-document-picker';
import * as XLSX from 'xlsx';
import {Stop} from '../types';

export interface ColumnMapping {
  latCol: string;
  lngCol: string;
  nameCol: string | null;
  addressCol: string | null;
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  autoMapping: Partial<ColumnMapping>;
}

const LAT_KW = ['lat', 'latitude', 'latitud', 'lat_decimal', 'latitude_decimal'];
const LNG_KW = ['lng', 'lon', 'long', 'longitude', 'longitud', 'lng_decimal', 'longitude_decimal'];
const NAME_KW = ['nome', 'name', 'local', 'destino', 'ponto', 'titulo', 'title', 'descricao', 'description', 'cliente', 'razao'];
const ADDR_KW = ['endereco', 'endereço', 'address', 'logradouro', 'rua', 'end'];

function detectCol(headers: string[], keywords: string[]): string | null {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const lowers = headers.map(norm);
  for (const kw of keywords) {
    const idx = lowers.findIndex(h => h === kw || h.startsWith(kw));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

export function autoDetect(headers: string[]): Partial<ColumnMapping> {
  return {
    latCol: detectCol(headers, LAT_KW) ?? undefined,
    lngCol: detectCol(headers, LNG_KW) ?? undefined,
    nameCol: detectCol(headers, NAME_KW) ?? undefined,
    addressCol: detectCol(headers, ADDR_KW) ?? undefined,
  };
}

function parseCSVText(text: string): {headers: string[]; rows: Record<string, string>[]} {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return {headers: [], rows: []};
  const sep = lines[0].includes(';') ? ';' : ',';
  const strip = (s: string) => s.trim().replace(/^["']|["']$/g, '');
  const headers = lines[0].split(sep).map(strip);
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(strip);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? '';
    });
    return row;
  });
  return {headers, rows};
}

export async function pickAndParse(): Promise<ParsedFile | null> {
  let picked;
  try {
    picked = await DocumentPicker.pickSingle({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain',
        'public.comma-separated-values-text',
      ],
      copyTo: 'cachesDirectory',
    });
  } catch (e) {
    if (DocumentPicker.isCancel(e)) return null;
    throw e;
  }

  const name = (picked.name ?? '').toLowerCase();
  const isText =
    name.endsWith('.csv') ||
    name.endsWith('.txt') ||
    (picked.type ?? '').includes('text');

  const fileUri = picked.fileCopyUri ?? picked.uri;
  const response = await fetch(fileUri);
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];

  if (isText) {
    const text = await response.text();
    ({headers, rows} = parseCSVText(text));
  } else {
    const buffer = await response.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), {type: 'array'});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });
    if (data.length > 0) {
      headers = Object.keys(data[0]);
      rows = data as Record<string, string>[];
    }
  }

  return {headers, rows, autoMapping: autoDetect(headers)};
}

export function rowsToStops(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Stop[] {
  return rows
    .map((row, i) => {
      const lat = parseFloat((row[mapping.latCol] ?? '').replace(',', '.'));
      const lng = parseFloat((row[mapping.lngCol] ?? '').replace(',', '.'));
      if (isNaN(lat) || isNaN(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return {
        id: `imp-${Date.now()}-${i}`,
        name: (mapping.nameCol ? row[mapping.nameCol] : '') || `Parada ${i + 1}`,
        address: (mapping.addressCol ? row[mapping.addressCol] : '') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
      } as Stop;
    })
    .filter((s): s is Stop => s !== null);
}
