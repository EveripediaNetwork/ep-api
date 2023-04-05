import { IWiki } from "./IWiki";

export interface ITag {
	id: string;
	wikis: IWiki[];
}
