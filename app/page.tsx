import Editor from "@/components/Editor";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between bg-black text-white">
            <div className="w-full h-screen flex flex-col">
                <header className="h-16 border-b border-white/10 flex items-center px-6">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Lyrical Sticker Generator
                    </h1>
                </header>

                <div className="flex-1 overflow-hidden">
                    <Editor />
                </div>
            </div>
        </main>
    );
}
