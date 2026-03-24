-- Chunk 7: event-day check-in / check-out on approved trade corals (EVENT exchanges only).

ALTER TABLE `trade_corals` ADD COLUMN `eventHandoffStatus` ENUM('AWAITING_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT') NULL;

CREATE INDEX `trade_corals_eventHandoffStatus_idx` ON `trade_corals`(`eventHandoffStatus`);

UPDATE `trade_corals` AS tc
INNER JOIN `trades` AS t ON t.`id` = tc.`tradeId`
INNER JOIN `exchanges` AS e ON e.`id` = t.`exchangeId`
SET tc.`eventHandoffStatus` = 'AWAITING_CHECKIN'
WHERE t.`status` = 'APPROVED'
  AND e.`kind` = 'EVENT';
