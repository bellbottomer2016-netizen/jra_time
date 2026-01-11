'use client';

import { Settings } from '@/lib/types';

// Basic styles inline for simplicity as this is a small component

interface Props {
    settings: Settings;
    onToggle: (key: keyof Settings) => void;
    onEnableAudio: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function SettingsPanel({ settings, onToggle, onEnableAudio, onRefresh, isRefreshing }: Props) {
    return (
        <div className="bg-card p-4 rounded mb-4 border text-white">
            <div className="flex gap-2 mb-4">
                {!settings.audioEnabled ? (
                    <button
                        onClick={onEnableAudio}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        style={{ background: 'var(--alert-red)' }}
                    >
                        🔔 通知音を有効にする
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            // We should use the prop strictly
                            onEnableAudio(); // This plays the 'pre-warning' sound in current impl
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                        🔊 テスト再生<br /><span className="text-xs font-normal">(初回のみ押してください)</span>
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded flex justify-center items-center gap-2"
                >
                    {isRefreshing ? <span className="animate-spin">↻</span> : <span>↻</span>}
                    <span>更新</span>
                </button>
            </div>

            {settings.audioEnabled && (
                <p className="text-xs text-yellow-500 mb-4 text-center">
                    ※ブラウザの制限により、このボタンを押すまで自動音声は再生されません。
                </p>
            )}

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.heavyPrizeMode}
                        onChange={() => onToggle('heavyPrizeMode')}
                        className="w-5 h-5 accent-green-600"
                    />
                    <span>重賞モード（G3以上の10分前に予鈴）</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.g1OnlyMode}
                        onChange={() => onToggle('g1OnlyMode')}
                        className="w-5 h-5 accent-purple-600"
                    />
                    <span>G1限定モード（G1の10分前に予鈴）</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={() => onToggle('notificationsEnabled')}
                        className="w-5 h-5 accent-blue-600"
                    />
                    <span>ブラウザ通知（デスクトップ通知）</span>
                </label>

                <hr className="border-gray-600 my-2" />

                <label className="flex items-center gap-2 cursor-pointer text-yellow-300">
                    <input
                        type="checkbox"
                        checked={settings.notifyOnlyHeavy}
                        onChange={() => onToggle('notifyOnlyHeavy')}
                        className="w-5 h-5 accent-yellow-500"
                    />
                    <span>平場・特別レースの通知（1分前）を無効にする</span>
                </label>

                <p className="text-xs text-secondary mt-2">
                    ※チェックを入れると、G3・G2・G1以外のレースでは一切音が鳴りません。
                </p>
            </div>

            <div className="mt-4 border-t pt-2 border-gray-600">
                <div className="text-sm mb-2 text-gray-300">リンク先設定:</div>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="linkProvider"
                            checked={settings.linkProvider === 'netkeiba'}
                            onChange={() => onToggle('linkProvider' as any)}
                            className="scale-125"
                        />
                        <span>Netkeiba (推奨)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="linkProvider"
                            checked={settings.linkProvider === 'jra'}
                            onChange={() => onToggle('linkProvider' as any)}
                            className="scale-125"
                        />
                        <span>JRA公式 (トップのみ)</span>
                    </label>
                </div>
                {settings.linkProvider === 'jra' && (
                    <p className="text-xs text-yellow-400 mt-1">
                        ※ JRA公式はトップページへのリンクとなります。
                    </p>
                )}
            </div>
        </div>
    );
}
