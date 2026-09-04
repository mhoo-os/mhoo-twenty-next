type AssertMhooClosedBetaPreviewArgs = Readonly<{
  name: string;
  html: string;
  requiredMarkers: readonly string[];
}>;

const UPSTREAM_RESIDUE = ['Twenty', 'twenty.com'] as const;
const APPROVED_MHOO_ATTRIBUTIONS = [
  /<a\b(?=[^>]*\bhref="\/legal\/open-source")(?=[^>]*\btarget="_blank")[^>]*>Powered by Twenty<\/a>/g,
  /<a\b(?=[^>]*\bhref="https:\/\/beta\.mhoo\.app\/legal\/open-source")[^>]*>Powered by Twenty<\/a>/g,
] as const;

export const assertMhooClosedBetaPreview = ({
  name,
  html,
  requiredMarkers,
}: AssertMhooClosedBetaPreviewArgs): void => {
  const missingMarkers = requiredMarkers.filter(
    (marker) => !html.includes(marker),
  );
  const htmlWithoutApprovedAttribution = APPROVED_MHOO_ATTRIBUTIONS.reduce(
    (candidate, approvedAttribution) =>
      candidate.replaceAll(approvedAttribution, ''),
    html,
  );
  const residue = UPSTREAM_RESIDUE.filter((marker) =>
    htmlWithoutApprovedAttribution.includes(marker),
  );

  if (missingMarkers.length === 0 && residue.length === 0) {
    return;
  }

  throw new Error(
    `Mhoo preview validation failed for ${name}: missing markers [${missingMarkers.join(
      ', ',
    )}], upstream residue [${residue.join(', ')}]`,
  );
};
