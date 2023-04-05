import {
	CommonMetaIds,
	EditSpecificMetaIds,
	WikiPossibleSocialsList,
} from "@everipedia/iq-utils";
import Metadata from "../../Database/Entities/metadata.entity";

import Wiki from "../../Database/Entities/wiki.entity";

export const getWikiMetadataById = (
	wiki: Wiki,
	id: CommonMetaIds | EditSpecificMetaIds,
) => wiki.metadata.find((m: Metadata) => m.id === id);

export const isValidUrl = (urlString: string) => {
	try {
		return Boolean(new URL(urlString));
	} catch (e) {
		return false;
	}
};

export const getWikiInternalLinks = (content: string): number => {
	const markdownLinks = content.match(/\[(.*?)\]\((.*?)\)/g);
	let internalLinksCount = 0;
	markdownLinks?.forEach((link) => {
		const linkMatch = link.match(/\[(.*?)\]\((.*?)\)/);
		const url = linkMatch?.[2];
		if (url && url.charAt(0) !== "#" && isValidUrl(url)) {
			const urlURL = new URL(url);
			if (
				urlURL.hostname === "everipedia.org" ||
				urlURL.hostname.endsWith(".everipedia.org")
			) {
				internalLinksCount += 1;
			}
		}
	});

	return internalLinksCount;
};

export const getWikiCitationLinks = (wiki: Wiki) => {
	const rawWikiReferences = getWikiMetadataById(
		wiki,
		CommonMetaIds.REFERENCES,
	)?.value;

	if (
		rawWikiReferences === undefined ||
		rawWikiReferences?.trim().length === 0
	) {
		return 0;
	}

	const wikiReferences = JSON.parse(rawWikiReferences);

	return wikiReferences.length;
};

export const getSocialsCount = (wiki: Wiki): number => {
	let socialsCount = 0;
	wiki.metadata.forEach((meta) => {
		if (WikiPossibleSocialsList.includes(meta.id as CommonMetaIds)) {
			if (meta.value) {
				socialsCount += 1;
			}
		}
	});
	return socialsCount;
};
