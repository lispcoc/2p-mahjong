import React, { useState, useEffect } from 'react'
import { GameState, Tile } from '../../types/GameTypes'
import { TileImage } from '../TileImage'
import { FuroDisplay } from '../FuroDisplay'

interface ScoreResultModalProps {
  scoreResult: any
  gameState: GameState
  nextRoundReady: boolean
  onNextRound: () => void
  winnerId: string | null
  winnerHand: Tile[]
  winnerMelds: Tile[][]
  tenpaiStatus?: Record<string, boolean> | null
  notenPenalty?: { amount: number; tenpaiPlayer: string; notenPlayer: string } | null
  playerOrder?: string[]
  playerNames?: Record<string, string>
  isSpectator?: boolean
  onLeave?: () => void
}

export function ScoreResultModal({
  scoreResult,
  gameState,
  nextRoundReady,
  onNextRound,
  winnerId,
  winnerHand,
  winnerMelds,
  tenpaiStatus,
  notenPenalty,
  playerOrder,
  playerNames,
  isSpectator = false,
  onLeave,
}: ScoreResultModalProps) {
  // max-sm (< 640px) でタイルを70%サイズにする
  const [tileScale, setTileScale] = useState(1)
  useEffect(() => {
    const update = () => setTileScale(window.innerWidth < 640 ? 0.7 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!scoreResult) return null

  // 流局や引き分けなどのケース判定
  // isDraw フラグが明示的にtrueの場合のみ、引き分けとして扱う
  // そうでない場合は、scoreResult.validの値を使用して判定
  const isDrawOrAbort = scoreResult.isDraw === true
  const winnerName = winnerId
    ? (gameState?.players?.find((player: any) => player.userId === winnerId)?.playerName || winnerId)
    : null
  const hasWinnerTiles = winnerHand.length > 0 || winnerMelds.length > 0

  // 起家（東家）と非起家の判定
  const dealerId = scoreResult.dealerId ?? gameState?.dealerId ?? null
  const allPlayers = gameState?.players ?? []
  // playerOrder があればその順、なければ起家優先でソート
  const orderedPlayers = playerOrder
    ? playerOrder
        .map((id) => allPlayers.find((p) => p.userId === id))
        .filter(Boolean) as Array<{ userId: string; playerName: string }>
    : [
        ...allPlayers.filter((p) => p.userId === dealerId),
        ...allPlayers.filter((p) => p.userId !== dealerId),
      ]
  const dealerPlayer = orderedPlayers.find((p) => p.userId === dealerId) ?? orderedPlayers[0]
  const nonDealerPlayer = orderedPlayers.find((p) => p.userId !== dealerPlayer?.userId) ?? orderedPlayers[1]

  // 点数移動の計算
  const prevScores: Record<string, number> | null = scoreResult.previousScores ?? null
  const currentScores: Record<string, number> | null =
    scoreResult.scores ?? (gameState?.scores as Record<string, number> | undefined) ?? null
  const getScoreChange = (uid: string): number | null => {
    if (!prevScores || !currentScores) return null
    const prev = prevScores[uid]
    const curr = currentScores[uid]
    if (prev === undefined || curr === undefined) return null
    return curr - prev
  }
  const dealerChange = dealerPlayer ? getScoreChange(dealerPlayer.userId) : null
  const nonDealerChange = nonDealerPlayer ? getScoreChange(nonDealerPlayer.userId) : null
  const dealerCurrentScore = dealerPlayer && currentScores ? (currentScores[dealerPlayer.userId] ?? null) : null
  const nonDealerCurrentScore = nonDealerPlayer && currentScores ? (currentScores[nonDealerPlayer.userId] ?? null) : null

  // デバッグログ
  if (process.env.NODE_ENV === 'development') {
    console.log('[ScoreResultModal] render:', {
      winnerId,
      winnerName,
      scoreResult_valid: scoreResult?.valid,
      isDrawOrAbort,
      hasWinnerTiles,
      winnerHand_length: winnerHand.length,
      winnerMelds_length: winnerMelds.length,
      winningTile: scoreResult?.winningTile,
      dealerId,
      dealerPlayer: dealerPlayer?.playerName,
      nonDealerPlayer: nonDealerPlayer?.playerName,
      dealerChange,
      nonDealerChange,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-mahjong-dark-primary p-2 max-w-[95vw] w-[1200px] max-h-[90vh] overflow-auto shadow-2xl border-4 border-white">
        {(winnerName || winnerId) && !isDrawOrAbort && scoreResult.valid && (hasWinnerTiles || scoreResult.winningTile) && (
          <div className="mb-3 p-3 bg-mahjong-dark-secondary border-2 border-white">
            <div className="flex gap-3 items-start flex-wrap">
              {winnerMelds.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <FuroDisplay
                    melds={winnerMelds}
                    layout="horizontal"
                    wrapperClassName="flex gap-2 flex-wrap"
                    seatWindYou={gameState?.seatWinds?.[winnerId ?? '']}
                    seatWindOpponent={gameState?.seatWinds?.[gameState?.players?.find((p: any) => p.userId !== winnerId)?.userId ?? '']}
                    concealedMeldIndices={new Set(gameState?.tiles?.[winnerId ?? '']?.concealedMeldIndices ?? [])}
                    daiminkanMeldIndices={new Set(gameState?.tiles?.[winnerId ?? '']?.daiminkanMeldIndices ?? [])}
                  />
                </div>
              )}
              <div className="flex gap-px flex-nowrap items-center overflow-x-auto">
                {winnerHand.slice(0, winnerHand.length - 1).map((tile, idx) => (
                  <TileImage key={`winner-hand-${idx}`} tile={tile} scale={tileScale} />
                ))}
                {/* 和了牌を右端にスペースを空けて表示 */}
                {scoreResult.winningTile && (
                  <span className="flex items-center ml-4">
                    <TileImage tile={scoreResult.winningTile} scale={tileScale} />
                  </span>
                )}
                {/* winningTileがなければ最後の牌を和了牌として表示 */}
                {!scoreResult.winningTile && winnerHand.length > 0 && (
                  <span className="flex items-center ml-4">
                    <TileImage tile={winnerHand[winnerHand.length - 1]} scale={tileScale} />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <h2 className={`text-2xl font-bold text-center mb-2 ${
          isDrawOrAbort ? 'text-yellow-300' : (scoreResult.valid ? 'text-green-300' : 'text-red-400')
        }`}>
          {isDrawOrAbort
            ? (scoreResult.scoreType?.includes('Draw') ? '流局' : (scoreResult.scoreType || 'ゲーム終了'))
            : (scoreResult.valid
                ? null
                : '役なし')}
        </h2>

        {/* ドラ・裏ドラ表示 */}
        {scoreResult.valid && !isDrawOrAbort && (
          <div className="mt-4 p-2 bg-mahjong-dark-secondary border-2 border-yellow-400 flex gap-2 items-center justify-center flex-wrap">
            {/* 表ドラ表示 */}
            {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
              <div className="w-full flex items-center gap-3 px-3 py-2 bg-yellow-100 rounded border border-yellow-600">
                <div className="text-xs text-gray-600 font-bold w-[65px]">
                  表ドラ
                </div>
                <div className="flex gap-1.5 items-center">
                  {gameState.dora.indicators.map((tile, idx) => (
                    <TileImage key={`dora-ind-${idx}`} tile={tile} scale={tileScale} />
                  ))}
                </div>
                {gameState.dora.tiles && gameState.dora.tiles.length > 0 && (
                  <>
                    <div className="text-xs text-gray-400">→</div>
                    <div className="flex gap-1.5 items-center">
                      {gameState.dora.tiles.map((tile, idx) => (
                        <TileImage key={`dora-tile-${idx}`} tile={tile} scale={tileScale} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 裏ドラ表示 (リーチ和了時のみ) */}
            {gameState.dora && gameState.dora.uraIndicators && gameState.dora.uraIndicators.length > 0 &&
              scoreResult.yaku?.some((y: any) => ['リーチ', '立直', 'ダブルリーチ', 'W立直', 'ダブル立直'].includes(y.name)) && (
              <div className="w-full flex items-center gap-3 px-3 py-2 bg-yellow-200 rounded border border-yellow-700">
                <div className="text-xs text-gray-600 font-bold w-[65px]">
                  裏ドラ
                </div>
                <div className="flex gap-1.5 items-center">
                  {gameState.dora.uraIndicators.map((tile, idx) => (
                    <TileImage key={`ura-ind-${idx}`} tile={tile} scale={tileScale} />
                  ))}
                </div>
                {gameState.dora.uraTiles && gameState.dora.uraTiles.length > 0 && (
                  <>
                    <div className="text-xs text-gray-400">→</div>
                    <div className="flex gap-1.5 items-center">
                      {gameState.dora.uraTiles.map((tile, idx) => (
                        <TileImage key={`ura-tile-${idx}`} tile={tile} scale={tileScale} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {scoreResult.valid && !isDrawOrAbort ? (
          <>
            <div className="mt-4 p-4 bg-mahjong-dark-secondary border-2 border-white">
              {scoreResult.yaku && scoreResult.yaku.length > 0 ? (
                <div className="text-sm">
                  {scoreResult.yaku.map((y: any, idx: number) => (
                    <div key={idx} className={`flex justify-between py-1.5 px-0 border-b border-white text-white`}>
                      <span className="font-bold">{y.name}</span>
                      <span className={`${y.isYakuman ? 'text-yellow-300 font-bold' : 'text-green-300'}`}>
                        {y.isYakuman ? (y.yakumanValue === 2 ? 'ダブル役満' : '役満') : `${y.han}飜`}
                      </span>
                    </div>
                  ))}
                  {scoreResult.ronMultiplier && scoreResult.ronMultiplier !== 1 && (
                    <div className="flex justify-between py-1.5 px-0 text-white">
                      <span className="font-bold">ロン</span>
                      <span className="text-orange-300 font-bold">×{scoreResult.ronMultiplier}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-300 italic text-xs m-0">役なし</p>
              )}
            </div>

            <div className="mt-4 p-4 bg-mahjong-dark-tertiary border-2 border-white text-center">
              <div className="text-4xl font-bold text-yellow-300 mb-2">
                {scoreResult.score}点
              </div>
              {typeof scoreResult.riichiDeposits === 'number' && scoreResult.riichiDeposits > 0 && (
                <div className="text-sm text-green-300 mb-1.5">
                  供託 +{scoreResult.riichiDeposits.toLocaleString()}点
                </div>
              )}
              <div className="text-base text-gray-300 mb-1">
                {scoreResult.scoreType}
              </div>
              <div className="hidden text-xs text-gray-400">
                {scoreResult.han}飜 {scoreResult.fu}符
              </div>
            </div>

            {scoreResult.calculation && (
              <div className="hidden mt-4 p-3 bg-mahjong-dark-tertiary border-2 border-white text-xs whitespace-pre-wrap font-mono text-gray-300 max-h-50 overflow-auto">
                {scoreResult.calculation}
              </div>
            )}
          </>
        ) : isDrawOrAbort ? (
          <>
            <div className="mt-4 p-4 bg-yellow-900/60 border-2 border-yellow-300 text-center">
              <p className="text-base text-yellow-300 my-2.5">
                {scoreResult.scoreType || 'ゲームが終了しました'}
              </p>
              <p className="text-sm text-gray-300 my-2.5">
                (このラウンドは引き分けです)
              </p>
              {notenPenalty && (
                <div className="mt-3 p-3 bg-yellow-800/50 border border-yellow-400 rounded">
                  <p className="text-sm text-yellow-300 font-bold m-0 mb-1">ノーテン缰符</p>
                  <p className="text-sm text-white m-0">
                    {playerNames?.[notenPenalty.notenPlayer] || notenPenalty.notenPlayer} → {playerNames?.[notenPenalty.tenpaiPlayer] || notenPenalty.tenpaiPlayer}: {notenPenalty.amount.toLocaleString()}点
                  </p>
                </div>
              )}
            </div>

            {/* 流局時の手牌と聴牌情報表示 */}
            {gameState?.players && playerOrder && tenpaiStatus && (
              <div className="mt-4 p-4 bg-mahjong-dark-secondary border-2 border-white">
                <h3 className="mt-0 mb-4 text-white text-base font-bold">
                  手牌・聴牌情報
                </h3>
                <div className="flex flex-col gap-4">
                  {playerOrder.map((playerId) => {
                    const player = gameState.players?.find((p) => p.userId === playerId)
                    const playerName = playerNames?.[playerId] || player?.playerName || playerId
                    const hand = gameState?.tiles?.[playerId]?.hand || []
                    const melds = gameState?.tiles?.[playerId]?.melds || []
                    const isTenpai = tenpaiStatus[playerId]

                    return (
                      <div key={playerId} className="p-3 bg-mahjong-dark-tertiary border border-white">
                        <div className="text-sm font-bold text-white mb-2 flex items-center gap-3">
                          <span>{playerName}</span>
                          <span className={`${isTenpai ? 'bg-green-300 text-black' : 'bg-red-400 text-white'} px-2 py-1 text-xs font-bold rounded`}>
                            {isTenpai ? '聴牌' : 'ノーテン'}
                          </span>
                        </div>
                        <div className="flex gap-3 items-start flex-wrap">
                          {melds.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              <FuroDisplay
                                melds={melds}
                                layout="horizontal"
                                wrapperClassName="flex gap-2 flex-wrap"
                                seatWindYou={gameState?.seatWinds?.[playerId]}
                                seatWindOpponent={gameState?.seatWinds?.[gameState?.players?.find((p: any) => p.userId !== playerId)?.userId ?? '']}
                                concealedMeldIndices={new Set(gameState?.tiles?.[playerId]?.concealedMeldIndices ?? [])}
                                daiminkanMeldIndices={new Set(gameState?.tiles?.[playerId]?.daiminkanMeldIndices ?? [])}
                              />
                            </div>
                          )}
                          <div className="flex gap-px flex-nowrap items-center overflow-x-auto">
                            {hand.map((tile: Tile, idx: number) => (
                              <TileImage key={`hand-${playerId}-${idx}`} tile={tile} faceDown={!isTenpai} scale={tileScale} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-300 text-sm">
            {scoreResult.error || '役がありません'}
          </p>
        )}

        {/* 和了時の点数移動表示 */}
        {!isDrawOrAbort && scoreResult.valid && dealerPlayer && nonDealerPlayer && (
          <div className="mt-4 mb-2 grid grid-cols-2 bg-mahjong-dark-secondary border-2 border-white">
            {/* 起家 */}
            <div className="p-3 text-center">
              <div className={`text-base font-bold mb-1 ${dealerPlayer.userId === winnerId ? 'text-green-300' : 'text-white'}`}>
                {dealerPlayer.playerName}
                {dealerPlayer.userId === winnerId && (
                  <span className="ml-2 text-xs font-bold text-white bg-green-600 px-1.5 py-0.5 rounded">
                    {(scoreResult.winType || scoreResult.scoreType || '').replace('!', '')}
                  </span>
                )}
              </div>
              {dealerCurrentScore !== null && (
                <div className="text-lg font-bold text-white">
                  {dealerCurrentScore.toLocaleString()}点
                </div>
              )}
              {dealerChange !== null && (
                <div className={`text-sm font-bold mt-0.5 ${dealerChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dealerChange >= 0 ? '+' : ''}{dealerChange.toLocaleString()}
                </div>
              )}
            </div>
            {/* 非起家 */}
            <div className="p-3 text-center">
              <div className={`text-base font-bold mb-1 ${nonDealerPlayer.userId === winnerId ? 'text-green-300' : 'text-white'}`}>
                {nonDealerPlayer.playerName}
                {nonDealerPlayer.userId === winnerId && (
                  <span className="ml-2 text-xs font-bold text-white bg-green-600 px-1.5 py-0.5 rounded">
                    {(scoreResult.winType || scoreResult.scoreType || '').replace('!', '')}
                  </span>
                )}
              </div>
              {nonDealerCurrentScore !== null && (
                <div className="text-lg font-bold text-white">
                  {nonDealerCurrentScore.toLocaleString()}点
                </div>
              )}
              {nonDealerChange !== null && (
                <div className={`text-sm font-bold mt-0.5 ${nonDealerChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {nonDealerChange >= 0 ? '+' : ''}{nonDealerChange.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {isSpectator && onLeave && (
          <button
            onClick={onLeave}
            className="mt-4 px-5 py-2.5 text-sm font-bold border-2 border-red-400 w-full transition-colors bg-mahjong-dark-secondary hover:bg-red-900 text-red-300 cursor-pointer"
          >
            退室する
          </button>
        )}
        {!isSpectator && (
          <button
            onClick={onNextRound}
            disabled={nextRoundReady}
            className={`mt-4 px-5 py-2.5 text-sm font-bold border-2 border-white w-full transition-colors ${
              nextRoundReady
                ? 'bg-gray-600 cursor-not-allowed text-white'
                : 'bg-mahjong-dark-secondary hover:bg-green-700 text-white cursor-pointer'
            }`}
          >
            {nextRoundReady ? '準備完了' : '次へ'}
          </button>
        )}
      </div>
    </div>
  )
}
