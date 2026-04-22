-- REEFxCHANGE mock seed data
-- Run this AFTER schema-setup.sql.
-- Safe for non-production testing/staging data bootstrap.

USE `reefx`;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

-- Optional reset block for repeatable reseeding (enable only in non-production)
-- DELETE FROM `admin_audit_logs`;
-- DELETE FROM `magic_link_tokens`;
-- DELETE FROM `sessions`;
-- DELETE FROM `trade_corals`;
-- DELETE FROM `trades`;
-- DELETE FROM `exchange_listings`;
-- DELETE FROM `exchange_invites`;
-- DELETE FROM `exchange_memberships`;
-- DELETE FROM `corals`;
-- DELETE FROM `user_addresses`;
-- DELETE FROM `exchanges`;
-- DELETE FROM `alias_generator_words`;
-- DELETE FROM `users`;

INSERT INTO `users`
  (`id`, `email`, `alias`, `avatarEmoji`, `tosAcceptedAt`, `tosVersion`, `privacyAcceptedAt`, `privacyVersion`, `contactPreference`, `onboardingPath`, `onboardingCompletedAt`, `globalRole`, `passwordHash`, `createdAt`, `updatedAt`)
VALUES
  ('usr_super_admin', 'admin@mock.example.test', 'REEFxCHANGE Admin', '🪸', '2026-04-01 09:00:00.000', 'v1', '2026-04-01 09:00:00.000', 'v1', 'EMAIL', 'GROUP_AND_EVENT', '2026-04-01 09:10:00.000', 'SUPER_ADMIN', NULL, '2026-04-01 09:00:00.000', '2026-04-01 09:00:00.000'),
  ('usr_event_mgr', 'event.manager@mock.example.test', 'Event Manager', '🎟️', '2026-04-01 09:01:00.000', 'v1', '2026-04-01 09:01:00.000', 'v1', 'EMAIL', 'EVENT_ONLY', '2026-04-01 09:11:00.000', 'MEMBER', NULL, '2026-04-01 09:01:00.000', '2026-04-01 09:01:00.000'),
  ('usr_group_mgr', 'group.owner@mock.example.test', 'Group Owner', '🤿', '2026-04-01 09:02:00.000', 'v1', '2026-04-01 09:02:00.000', 'v1', 'EMAIL', 'GROUP_AND_EVENT', '2026-04-01 09:12:00.000', 'MEMBER', NULL, '2026-04-01 09:02:00.000', '2026-04-01 09:02:00.000'),
  ('usr_alice', 'alice@mock.example.test', 'Alice Reef', '🐠', '2026-04-01 09:03:00.000', 'v1', '2026-04-01 09:03:00.000', 'v1', 'EMAIL', 'GROUP_AND_EVENT', '2026-04-01 09:13:00.000', 'MEMBER', NULL, '2026-04-01 09:03:00.000', '2026-04-01 09:03:00.000'),
  ('usr_bob', 'bob@mock.example.test', 'Bob Coral', '🧪', '2026-04-01 09:04:00.000', 'v1', '2026-04-01 09:04:00.000', 'v1', 'SMS', 'EVENT_ONLY', '2026-04-01 09:14:00.000', 'MEMBER', NULL, '2026-04-01 09:04:00.000', '2026-04-01 09:04:00.000'),
  ('usr_chloe', 'chloe@mock.example.test', 'Chloe Frag', '📦', '2026-04-01 09:05:00.000', 'v1', '2026-04-01 09:05:00.000', 'v1', 'EMAIL', 'GROUP_AND_EVENT', '2026-04-01 09:15:00.000', 'MEMBER', NULL, '2026-04-01 09:05:00.000', '2026-04-01 09:05:00.000');

INSERT INTO `alias_generator_words` (`id`, `word`, `createdAt`) VALUES
  ('agw_reef', 'reef', '2026-04-01 09:20:00.000'),
  ('agw_tide', 'tide', '2026-04-01 09:20:00.000'),
  ('agw_anemone', 'anemone', '2026-04-01 09:20:00.000'),
  ('agw_coral', 'coral', '2026-04-01 09:20:00.000');

INSERT INTO `exchanges`
  (`id`, `name`, `description`, `logo40Url`, `logo80Url`, `logo512Url`, `logoUpdatedAt`, `kind`, `visibility`, `eventDate`, `createdById`, `createdAt`, `updatedAt`)
VALUES
  ('ex_event_spring', 'Spring Frag Swap (Mock)', 'Mock public event exchange for QA and demo.', NULL, NULL, NULL, NULL, 'EVENT', 'PUBLIC', '2026-04-20 11:00:00.000', 'usr_super_admin', '2026-04-02 10:00:00.000', '2026-04-02 10:00:00.000'),
  ('ex_group_local', 'Local Reef Keepers (Mock)', 'Mock private group exchange for QA and demo.', NULL, NULL, NULL, NULL, 'GROUP', 'PRIVATE', NULL, 'usr_group_mgr', '2026-04-02 10:10:00.000', '2026-04-02 10:10:00.000');

INSERT INTO `exchange_memberships` (`id`, `exchangeId`, `userId`, `role`, `joinedAt`) VALUES
  ('mem_event_admin', 'ex_event_spring', 'usr_super_admin', 'EVENT_MANAGER', '2026-04-02 10:05:00.000'),
  ('mem_event_mgr', 'ex_event_spring', 'usr_event_mgr', 'EVENT_MANAGER', '2026-04-02 10:06:00.000'),
  ('mem_event_alice', 'ex_event_spring', 'usr_alice', 'MEMBER', '2026-04-02 10:07:00.000'),
  ('mem_event_bob', 'ex_event_spring', 'usr_bob', 'MEMBER', '2026-04-02 10:08:00.000'),
  ('mem_event_chloe', 'ex_event_spring', 'usr_chloe', 'MEMBER', '2026-04-02 10:09:00.000'),
  ('mem_group_owner', 'ex_group_local', 'usr_group_mgr', 'EVENT_MANAGER', '2026-04-02 10:11:00.000'),
  ('mem_group_alice', 'ex_group_local', 'usr_alice', 'MEMBER', '2026-04-02 10:12:00.000'),
  ('mem_group_bob', 'ex_group_local', 'usr_bob', 'MEMBER', '2026-04-02 10:13:00.000'),
  ('mem_group_chloe', 'ex_group_local', 'usr_chloe', 'MEMBER', '2026-04-02 10:14:00.000');

INSERT INTO `exchange_invites`
  (`id`, `exchangeId`, `email`, `tokenHash`, `expiresAt`, `usedAt`, `lastSentAt`, `invitedById`, `createdAt`)
VALUES
  ('inv_event_pending', 'ex_event_spring', 'new.member@mock.example.test', 'tok_inv_event_pending_0001', '2026-04-30 23:59:59.000', NULL, '2026-04-03 08:00:00.000', 'usr_event_mgr', '2026-04-03 08:00:00.000'),
  ('inv_group_used', 'ex_group_local', 'guest@mock.example.test', 'tok_inv_group_used_0001', '2026-04-30 23:59:59.000', '2026-04-04 12:15:00.000', '2026-04-03 09:00:00.000', 'usr_group_mgr', '2026-04-03 09:00:00.000');

INSERT INTO `corals`
  (`id`, `userId`, `name`, `description`, `imageUrl`, `listingMode`, `freeToGoodHome`, `profileStatus`, `coralType`, `colour`, `createdAt`, `updatedAt`)
VALUES
  ('cor_alice_hammer', 'usr_alice', 'Green Hammer Frag', 'Healthy branching hammer, beginner friendly.', NULL, 'BOTH', FALSE, 'UNLISTED', 'Hammer Coral', 'Green', '2026-04-05 10:00:00.000', '2026-04-05 10:00:00.000'),
  ('cor_alice_zoa', 'usr_alice', 'Rainbow Zoa Pack', 'Mixed zoa polyps from established colony.', NULL, 'POST', FALSE, 'UNLISTED', 'Zoanthid', 'Mixed', '2026-04-05 10:05:00.000', '2026-04-05 10:05:00.000'),
  ('cor_bob_acan', 'usr_bob', 'Acan Lord Colony', 'Well-fed acan with 8+ heads.', NULL, 'MEET', FALSE, 'UNLISTED', 'Acan', 'Red/Orange', '2026-04-05 10:10:00.000', '2026-04-05 10:10:00.000'),
  ('cor_chloe_monti', 'usr_chloe', 'Monti Cap Frag', 'Fast-growing plating montipora.', NULL, 'BOTH', TRUE, 'UNLISTED', 'Montipora', 'Orange', '2026-04-05 10:12:00.000', '2026-04-05 10:12:00.000'),
  ('cor_bob_torch', 'usr_bob', 'Gold Torch Head', 'Single-head torch, stable in medium flow.', NULL, 'BOTH', FALSE, 'TRADED', 'Torch Coral', 'Gold', '2026-04-05 10:20:00.000', '2026-04-05 10:20:00.000'),
  ('cor_chloe_favia', 'usr_chloe', 'Favia Disc', 'Chunky favia frag with good feeder response.', NULL, 'BOTH', FALSE, 'TRADED', 'Favia', 'Purple/Green', '2026-04-05 10:22:00.000', '2026-04-05 10:22:00.000');

INSERT INTO `exchange_listings`
  (`id`, `exchangeId`, `coralId`, `listedAt`, `expiresAt`)
VALUES
  ('lst_event_alice_hammer', 'ex_event_spring', 'cor_alice_hammer', '2026-04-06 09:00:00.000', '2026-07-05 09:00:00.000'),
  ('lst_event_alice_zoa', 'ex_event_spring', 'cor_alice_zoa', '2026-04-06 09:02:00.000', '2026-07-05 09:02:00.000'),
  ('lst_event_bob_acan', 'ex_event_spring', 'cor_bob_acan', '2026-04-06 09:03:00.000', '2026-07-05 09:03:00.000'),
  ('lst_event_chloe_monti', 'ex_event_spring', 'cor_chloe_monti', '2026-04-06 09:04:00.000', '2026-07-05 09:04:00.000'),
  ('lst_group_alice_hammer', 'ex_group_local', 'cor_alice_hammer', '2026-04-06 09:10:00.000', '2026-07-05 09:10:00.000'),
  ('lst_group_chloe_monti', 'ex_group_local', 'cor_chloe_monti', '2026-04-06 09:12:00.000', '2026-07-05 09:12:00.000');

INSERT INTO `trades`
  (`id`, `exchangeId`, `initiatorUserId`, `peerUserId`, `status`, `version`, `expiresAt`, `expiredNotifiedAt`, `createdAt`, `updatedAt`)
VALUES
  ('trd_event_offer_1', 'ex_event_spring', 'usr_alice', 'usr_bob', 'OFFER', 0, '2026-04-18 23:59:59.000', NULL, '2026-04-08 11:00:00.000', '2026-04-08 11:00:00.000'),
  ('trd_event_approved_1', 'ex_event_spring', 'usr_bob', 'usr_chloe', 'APPROVED', 1, '2026-04-16 23:59:59.000', NULL, '2026-04-08 12:00:00.000', '2026-04-08 12:30:00.000'),
  ('trd_group_expired_1', 'ex_group_local', 'usr_chloe', 'usr_alice', 'EXPIRED', 0, '2026-04-01 23:59:59.000', '2026-04-02 08:00:00.000', '2026-03-28 14:00:00.000', '2026-04-02 08:00:00.000');

INSERT INTO `trade_corals`
  (`id`, `tradeId`, `coralId`, `side`, `eventHandoffStatus`)
VALUES
  ('tcl_offer_1a', 'trd_event_offer_1', 'cor_alice_zoa', 'INITIATOR', NULL),
  ('tcl_offer_1b', 'trd_event_offer_1', 'cor_bob_acan', 'PEER', NULL),
  ('tcl_approved_1a', 'trd_event_approved_1', 'cor_bob_torch', 'INITIATOR', 'AWAITING_CHECKIN'),
  ('tcl_approved_1b', 'trd_event_approved_1', 'cor_chloe_favia', 'PEER', 'AWAITING_CHECKIN'),
  ('tcl_expired_1a', 'trd_group_expired_1', 'cor_chloe_monti', 'INITIATOR', NULL),
  ('tcl_expired_1b', 'trd_group_expired_1', 'cor_alice_hammer', 'PEER', NULL);

INSERT INTO `user_addresses`
  (`id`, `userId`, `line1`, `line2`, `town`, `region`, `postalCode`, `countryCode`, `townLatitude`, `townLongitude`, `createdAt`, `updatedAt`)
VALUES
  ('adr_alice', 'usr_alice', '12 Reef Lane', NULL, 'Plymouth', 'Devon', 'PL1 2AB', 'GB', 50.3755, -4.1427, '2026-04-01 12:00:00.000', '2026-04-01 12:00:00.000'),
  ('adr_bob', 'usr_bob', '8 Ocean Street', 'Flat 2', 'Exeter', 'Devon', 'EX1 1AA', 'GB', 50.7184, -3.5339, '2026-04-01 12:05:00.000', '2026-04-01 12:05:00.000'),
  ('adr_chloe', 'usr_chloe', '44 Coral Way', NULL, 'Bristol', 'Bristol', 'BS1 4ST', 'GB', 51.4545, -2.5879, '2026-04-01 12:10:00.000', '2026-04-01 12:10:00.000');

INSERT INTO `sessions`
  (`id`, `userId`, `tokenHash`, `expiresAt`, `createdAt`, `revokedAt`)
VALUES
  ('ses_admin_1', 'usr_super_admin', 'tok_session_admin_0001', '2026-05-01 12:00:00.000', '2026-04-10 08:00:00.000', NULL),
  ('ses_alice_1', 'usr_alice', 'tok_session_alice_0001', '2026-05-01 12:30:00.000', '2026-04-10 08:30:00.000', NULL),
  ('ses_bob_old', 'usr_bob', 'tok_session_bob_old_0001', '2026-04-05 12:30:00.000', '2026-04-01 08:30:00.000', '2026-04-04 17:00:00.000');

INSERT INTO `magic_link_tokens`
  (`id`, `userId`, `email`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`, `requestedIp`)
VALUES
  ('mlt_alice_used', 'usr_alice', 'alice@mock.example.test', 'tok_magic_alice_used_0001', '2026-04-10 10:05:00.000', '2026-04-10 10:02:00.000', '2026-04-10 10:00:00.000', '198.51.100.11'),
  ('mlt_chloe_open', 'usr_chloe', 'chloe@mock.example.test', 'tok_magic_chloe_open_0001', '2026-04-11 09:00:00.000', NULL, '2026-04-11 08:45:00.000', '198.51.100.12');

INSERT INTO `admin_audit_logs`
  (`id`, `actorUserId`, `action`, `targetType`, `targetId`, `metadata`, `ip`, `createdAt`)
VALUES
  ('aud_create_exchange_1', 'usr_super_admin', 'exchange.create', 'exchange', 'ex_event_spring', JSON_OBJECT('kind', 'EVENT', 'visibility', 'PUBLIC'), '198.51.100.2', '2026-04-02 10:00:05.000'),
  ('aud_assign_manager_1', 'usr_super_admin', 'exchange.assign_manager', 'exchange_membership', 'mem_event_mgr', JSON_OBJECT('exchangeId', 'ex_event_spring', 'userId', 'usr_event_mgr'), '198.51.100.2', '2026-04-02 10:06:10.000');

COMMIT;
