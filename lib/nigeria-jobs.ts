import { DOMParser } from '@xmldom/xmldom'
import type { JobSource } from './jobs'
import { stripHtmlToPlainText } from './strip-html'

const nigeriaPlaces =
  /\b(?:Abia|Abuja|Adamawa|Akwa Ibom|Anambra|Bauchi|Bayelsa|Benue|Borno|Cross River|Delta|Ebonyi|Edo|Ekiti|Enugu|Gombe|Imo|Jigawa|Kaduna|Kano|Katsina|Kebbi|Kogi|Kwara|Lagos|Nasarawa|Niger State|Ogun|Ondo|Osun|Oyo|Plateau|Rivers|Sokoto|Taraba|Yobe|Zamfara|Ibadan|Port Harcourt)\b/i

export async function fetchNigeriaJobs(): Promise<JobSource[]> {
  try {
    const response = await fetch('https://www.myjobmag.com/feeds/ng/jobsxml_by_categories.xml', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return []
    const xml = await response.text()
    if (xml.length > 4_000_000 || /<!DOCTYPE/i.test(xml)) return []
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    return Array.from(doc.getElementsByTagName('item')).map((item) => {
      const field = (key: string) => item.getElementsByTagName(key)[0]?.textContent?.trim() || ''
      const place = field('location')
      return {
        id: 'myjobmag-' + field('guid'),
        source: 'myjobmag',
        title: field('position'),
        company: field('company'),
        url: field('link'),
        description: stripHtmlToPlainText(field('description')),
        location:
          nigeriaPlaces.test(place) && !/\bnigeria\b/i.test(place)
            ? place + ', Nigeria'
            : place || 'Unspecified',
        remote: /\bremote\b/i.test(place + ' ' + field('position')),
        postedAt: field('pubDate') || undefined,
        expiresAt: field('expiryDate') || undefined,
      }
    })
  } catch {
    return []
  }
}
