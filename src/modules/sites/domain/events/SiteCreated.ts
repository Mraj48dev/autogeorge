export class SiteCreated {
  constructor(
    public readonly siteId: string,
    public readonly userId: string,
    public readonly siteName: string,
    public readonly createdAt: Date = new Date()
  ) {}
}