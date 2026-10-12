// The résumé as JSON Resume (https://jsonresume.org), the same data the PDF
// is typeset from, for software that would rather not parse a PDF.
import resume from '../../resume/resume.json';

export function GET() {
  return new Response(JSON.stringify(resume, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
