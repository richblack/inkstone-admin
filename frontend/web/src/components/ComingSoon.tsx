export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-zinc-300 mb-2">{title}</h2>
      <p className="text-zinc-500 text-sm">Coming soon</p>
    </div>
  );
}
