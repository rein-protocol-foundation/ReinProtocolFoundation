import { discordInviteUrl, discordQrCodePath } from '@/lib/community-invites.json'

export function DiscordInvitation() {
  return (
    <div className="discord-invitation">
      <div className="discord-invitation__copy">
        <p className="article-kicker">Join the conversation</p>
        <h4>Meet the community on Discord.</h4>
        <p>Ask a question, share what you’re learning, and connect with other people working with AI agents.</p>
        <a className="text-action" href={discordInviteUrl}>Join our Discord server <span aria-hidden="true">↗</span></a>
      </div>
      <figure className="discord-invitation__qr">
        <a href={discordInviteUrl} aria-label="Join our Discord server using the QR code link">
          <img src={discordQrCodePath} width="164" height="164" alt="QR code to join the Rein Discord server" loading="lazy" />
        </a>
        <figcaption>Scan to join on your phone</figcaption>
      </figure>
    </div>
  )
}
