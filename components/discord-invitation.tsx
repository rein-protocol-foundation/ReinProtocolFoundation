import { discordInviteUrl } from '@/lib/community-invites.json'

export function DiscordInvitation() {
  return <a className="primary-action discord-invitation" href={discordInviteUrl}>Join our Discord server <span aria-hidden="true">↗</span></a>
}
