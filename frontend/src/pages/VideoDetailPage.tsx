import { useParams } from 'react-router-dom';

function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Video Details: {id}
      </h1>

      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">
          Video details and analysis will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default VideoDetailPage;
